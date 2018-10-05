import { GraphQLResolveInfo } from 'graphql'

declare function graphqlOperationToPOJO(
    info: GraphQLResolveInfo
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
}

export default graphqlOperationToPOJO
