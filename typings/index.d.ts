import { GraphQLResolveInfo, GraphQLOutputType } from 'graphql'

declare function graphqlOperationToPOJO(
    info: GraphQLResolveInfo,
    options?: Options
): GraphQLOperationPOJO

export type GraphQLOperationPOJO = {
    operation: string
    fields: FieldPOJO[]
}

export type FieldPOJO = {
    name: string
    alias?: string
    fragmentType?: string
    fields?: FieldPOJO[]
    arguments?: { [name: string]: any }
    directives?: { [name: string]: any }
    path?: string
    returnType?: GraphQLOutputType
}

export type Options = {
    includeFieldPath?: boolean
    includeReturnTypes?: boolean
}

export default graphqlOperationToPOJO
