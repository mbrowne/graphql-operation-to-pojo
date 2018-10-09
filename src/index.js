// @flow
import './polyfills'
import { valueFromASTUntyped, getNamedType } from 'graphql'
import type {
    GraphQLResolveInfo,
    GraphQLCompositeType,
    GraphQLField,
    OperationDefinitionNode,
    SelectionNode,
    FieldNode,
    FragmentDefinitionNode,
    InlineFragmentNode,
    ArgumentNode,
    DirectiveNode
} from 'graphql'

export type GraphQLOperationPOJO = {
    operation: string,
    fields: FieldPOJO[]
}

export type FieldPOJO = {
    name: string,
    alias?: string,
    fragmentType?: string,
    fields?: FieldPOJO[],
    arguments?: Object,
    directives?: Object,
    path?: string
}

export type Options = {
    includeFieldPath?: boolean
}

/**
 * Convert a GraphQL operation to a JSON string. Internally uses graphqlOperationToPOJO().
 */
export function graphqlOperationToJSON(
    info: GraphQLResolveInfo,
    options?: Options
) {
    return JSON.stringify(graphqlOperationToPOJO(info, options))
}

/**
 * Converts the AST of a GraphQL operation (query/subscription/mutation) to an
 * easier-to-consume format. Returns a Plain Old Javascript Object (POJO),
 * ready to be serialized to a JSON string.
 */
export default function graphqlOperationToPOJO(
    info: GraphQLResolveInfo,
    options?: Options
): GraphQLOperationPOJO {
    // console.log('info: ', JSON.stringify(info))
    const operationAst = info.operation
    const converter = new ASTtoPOJOConverter(info, options)
    return {
        operation: operationAst.operation,
        fields: converter.convert()
    }
}

class ASTtoPOJOConverter {
    info: GraphQLResolveInfo
    options: Options

    static defaultOptions = {
        includeFieldPath: false
    }

    constructor(info: GraphQLResolveInfo, options?: Options) {
        this.info = info
        this.options = { ...ASTtoPOJOConverter.defaultOptions, ...options }
    }

    convert(
        ast:
            | OperationDefinitionNode
            | SelectionNode
            | FragmentDefinitionNode = this.info.operation,
        tree: FieldPOJO[] = [],
        parentPath = '',
        // the type definition from the schema that corresponds to `ast.selectionSet`
        parentSchemaDef: GraphQLCompositeType = this.getOperationTypeDef(),
        enclosingFragmentType?: string
    ): FieldPOJO[] {
        const fieldMap: { [key: string]: FieldPOJO } = {}
        for (const selectionAst of this.getSelections(ast)) {
            if (this.isFragment(selectionAst)) {
                const fragmentAst:
                    | FragmentDefinitionNode
                    | InlineFragmentNode = (this.getFragmentFieldAST(
                    selectionAst
                ): any)
                const fragmentType =
                    fragmentAst.typeCondition &&
                    fragmentAst.typeCondition.name.value
                const fragmentFields = this.convert(
                    fragmentAst,
                    tree,
                    parentPath,
                    parentSchemaDef,
                    fragmentType
                )
                // Add fragment fields to the fieldMap.
                // This is needed in case of fragment field overrides...graphql allows you to repeat fields that are
                // part of the fragment above and/or below the fragment. This matters because in the case of nested
                // selections, the later selections should be merged with the earlier ones.
                for (const fragmentField of fragmentFields) {
                    const key = this.generateFieldKey(
                        fragmentField,
                        parentSchemaDef
                    )
                    const existingField = fieldMap[key]
                    if (!existingField) {
                        fieldMap[key] = fragmentField
                    } else if (existingField.fields) {
                        existingField.fields = this.mergeFieldSelections(
                            existingField.fields,
                            fragmentField.fields
                        )
                    }
                }
            } else {
                const fieldAst: FieldNode = (selectionAst: any)
                const name = fieldAst.name ? fieldAst.name.value : undefined
                const alias = fieldAst.alias ? fieldAst.alias.value : undefined
                const field: FieldPOJO = {
                    name: fieldAst.name.value
                }
                if (alias) {
                    field.alias = alias
                }
                // Set the fragmentType if this field is part of a fragment
                if (enclosingFragmentType) {
                    field.fragmentType = enclosingFragmentType
                }
                const fieldPath =
                    (parentPath ? parentPath + '.' : '') + (alias || name || '')
                if (this.options.includeFieldPath) {
                    field.path = fieldPath
                }
                if (fieldAst.selectionSet) {
                    // get the type definition from the schema for the return type of this field
                    const returnType = this.getFieldReturnType(
                        field,
                        parentSchemaDef
                    )
                    const typeDef =
                        returnType &&
                        this.info.schema.getType(returnType.toString())
                    if (!typeDef) {
                        throw Error(
                            `graphqlOperationToPOJO(): Error matching query to schema: could not find type definition for field '${fieldPath}'`
                        )
                    }
                    field.fields = this.convert(
                        fieldAst,
                        [],
                        fieldPath,
                        (typeDef: any)
                    )
                }
                const args = this.argumentsFromAst(fieldAst.arguments)
                if (Object.keys(args).length) {
                    field.arguments = args
                }
                const directives = this.directivesFromAst(fieldAst.directives)
                if (Object.keys(directives).length) {
                    field.directives = directives
                }

                // Check for fragment field override. Field could also already exist if multiple fragments have the same field.
                // The later ones in the query take precedence over the earlier ones.
                const key = this.generateFieldKey(field, parentSchemaDef)
                const existingField = fieldMap[key]
                if (!existingField) {
                    fieldMap[key] = field
                } else if (existingField.fields) {
                    existingField.fields = this.mergeFieldSelections(
                        existingField.fields,
                        field.fields
                    )
                }
            }
        }
        return [...tree, ...(Object.values(fieldMap): any)]
    }

    // Get the top-level type definition (either Query, Mutation, or Subscription)
    getOperationTypeDef(): GraphQLCompositeType {
        const operationLowerCase = this.info.operation.operation
        const operationUCFirst =
            operationLowerCase[0].toUpperCase() + operationLowerCase.substr(1)
        return (this.info.schema: any)[`get${operationUCFirst}Type`]()
    }

    // generate a key for this field to be used in fieldMap
    // (note: not globally unique, just unique at the current nesting level)
    generateFieldKey(field: FieldPOJO, parentSchemaDef: GraphQLCompositeType) {
        const alias = field.alias || field.name
        // Fields are keyed by type in addition to alias/name.
        // This is used to determine whether or not to merge field selections.
        // If the same field name is included twice at the same level, the fields should be kept
        // separate if they belong to different fragment types (e.g. Exhibition vs. ArtFairParticipation),
        // but should be merged if they belong to the same concrete type (e.g. both belong to ArtworkResults).
        return alias + '.' + (field.fragmentType || parentSchemaDef.name)
    }

    // for a given field in the query, get its return type from the schema
    getFieldReturnType(
        field: FieldPOJO,
        parentSchemaDef: GraphQLCompositeType
    ) {
        // Get the concrete type for fragment fields.
        // This is needed because for fragment fields, the original parentSchemaDef might be a union or interface type.
        if (field.fragmentType) {
            parentSchemaDef = (this.info.schema.getType(
                field.fragmentType
            ): any)
        }
        // prettier-ignore
        const schemaField: GraphQLField<*, *> = (parentSchemaDef: any).getFields()[field.name]
        return schemaField && getNamedType(schemaField.type)
    }

    mergeFieldSelections(
        selectionSet1: FieldPOJO[],
        selectionSet2?: FieldPOJO[]
    ): FieldPOJO[] {
        if (!Array.isArray(selectionSet1)) {
            throw Error('selectionSet1 must be an array')
        }
        if (!selectionSet2) {
            return [...selectionSet1]
        }
        // $FlowFixMe - this can be removed after Object.fromEntries() is in the standard flow lib
        const selectionSet1ByName = Object.fromEntries(
            selectionSet1.map(field => [field.alias || field.name, field])
        )
        const mergedFieldsByName = { ...selectionSet1ByName }
        for (const field of selectionSet2) {
            const alias = field.alias || field.name
            const existingField = selectionSet1ByName[alias]
            if (
                existingField &&
                existingField.fields &&
                existingField.fragmentType === field.fragmentType
            ) {
                const mergedField = { ...field }
                mergedField.fields = this.mergeFieldSelections(
                    existingField.fields,
                    field.fields
                )
                mergedFieldsByName[alias] = mergedField
            } else {
                mergedFieldsByName[alias] = field
            }
        }
        return (Object.values(mergedFieldsByName): any)
    }

    isFragment(ast: SelectionNode) {
        return ast.kind === 'InlineFragment' || ast.kind === 'FragmentSpread'
    }

    getFragmentFieldAST(
        ast: SelectionNode
    ): FragmentDefinitionNode | FieldNode | InlineFragmentNode {
        if (ast.kind === 'FragmentSpread') {
            const fragmentName = ast.name.value
            return this.info.fragments[fragmentName]
        }
        return (ast: FieldNode | InlineFragmentNode)
    }

    getSelections(
        ast?: OperationDefinitionNode | SelectionNode | FragmentDefinitionNode
    ): $ReadOnlyArray<SelectionNode> {
        if (ast && ast.selectionSet && ast.selectionSet.selections) {
            return (ast.selectionSet: any).selections
        }
        return []
    }

    argumentsFromAst(ast?: $ReadOnlyArray<ArgumentNode>) {
        if (!ast) {
            return {}
        }
        const { variableValues } = this.info
        // $FlowFixMe
        const args = Object.fromEntries(
            ast.map(arg => {
                const name = arg.name.value
                // @TODO refactor to use valueFromAST() and pass type info in the expected format so that
                // we can support custom scalars as input arguments
                const val = valueFromASTUntyped(arg.value, variableValues)
                return [name, val]
            })
        )
        return args
    }

    directivesFromAst(ast?: $ReadOnlyArray<DirectiveNode>) {
        if (!ast) {
            return {}
        }
        // $FlowFixMe
        return Object.fromEntries(
            ast.map(directive => {
                return [
                    directive.name.value,
                    this.argumentsFromAst(directive.arguments)
                ]
            })
        )
    }
}
