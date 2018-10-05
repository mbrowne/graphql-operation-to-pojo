import { parse, buildASTSchema } from 'graphql'

const typeDefs = `
    type Widget {
        id: ID!
        name: String!
    }

    type User {
        id: ID!
        name: String!
        widgets(page: Int): [Widget!]!
        test(foo: Int): Int
    }

    type Query {
        widget(id: ID!): Widget
        user(id: ID!): User
    }
`

export default buildASTSchema(parse(typeDefs))
