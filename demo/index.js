const graphqlOperationToPOJO = require('../lib').default
const typeDefs = require('./schema')
const resolvers = require('./resolvers')
const { graphql, GraphQLObjectType, getNamedType } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')

// To explore the schema, see https://launchpad.graphql.com/mpjk0plp9

const query = `
{
    hero(episode:NEWHOPE) {
        name
        friends {
            name
            appearsIn
        }
    }
}`

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
})

// Output the result of graphqlOperationToPOJO() for every query
forEachTopLevelField(schema, (field) => {
    const fieldResolver = field.resolve
    field.resolve = (source, args, context, info) => {
        console.log(JSON.stringify(graphqlOperationToPOJO(info), undefined, 2))
        return fieldResolver(source, args, context, info)
    }
})

// Execute the query
graphql(schema, query)
    .then((result) => {
        if (result.errors) {
            console.log(result.errors)
        }
    })
    .catch((e) => {
        throw e
    })

function forEachTopLevelField(schema, fn) {
    const rootTypes = [
        schema.getQueryType(),
        schema.getMutationType(),
        schema.getSubscriptionType(),
    ].filter(Boolean)

    for (const type of rootTypes) {
        for (const field of Object.values(type.getFields())) {
            fn(field)
        }
    }
}
