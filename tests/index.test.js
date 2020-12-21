import { graphql, getNamedType } from 'graphql'
import schema from './fixtures/schema'
import graphqlOperationToPOJO from '../src'

describe('graphqlOperationToPOJO', () => {
    const nestedFragmentsQuery = `
        query userQuery($id: ID!) {
            user(id: $id) {
                ...A
                ... on User {
                    id
                }
            }
        }
        fragment A on User {
            widgets {
                id
            }
            ...B
        }
        fragment B on User {
            name
            widgets {
                name
            }
        }
    `

    const aliasQuery = `
        query($id: ID!) {
            user(id: $id) {
                aliasForWidgets: widgets {
                    id
                }
            }
        }
    `

    let info

    // Get the `info` argument for the above query
    schema.getQueryType().getFields().user.resolve = (a, b, c, infoArg) => {
        info = infoArg
        return null
    }

    // Adapted from a similar test for the graphql-parse-fields library:
    // https://github.com/tjmehta/graphql-parse-fields/blob/master/test/graphql-parse-fields.test.js
    it('should parse info fields ast w/ nested fragments', async () => {
        const data = await graphql(
            schema,
            nestedFragmentsQuery,
            null,
            {},
            { id: 1 }
        )
        expect(info).toBeDefined()
        if (data.errors) {
            throw new Error('graphql error(s):\n' + JSON.stringify(data.errors))
        }
        expect(graphqlOperationToPOJO(info)).toEqual({
            operation: 'query',
            fields: [
                {
                    name: 'user',
                    fields: [
                        {
                            name: 'widgets',
                            fields: [{ name: 'id' }, { name: 'name' }],
                            fragmentType: 'User',
                        },
                        { name: 'name', fragmentType: 'User' },
                        { name: 'id', fragmentType: 'User' },
                    ],
                    arguments: { id: '1' },
                },
            ],
        })
    })

    it('should parse aliases', async () => {
        const data = await graphql(schema, aliasQuery, null, {}, { id: 1 })
        expect(info).toBeDefined()
        if (data.errors) {
            throw new Error('graphql error(s):\n' + JSON.stringify(data.errors))
        }
        expect(graphqlOperationToPOJO(info)).toEqual({
            operation: 'query',
            fields: [
                {
                    name: 'user',
                    fields: [
                        {
                            name: 'widgets',
                            alias: 'aliasForWidgets',
                            fields: [{ name: 'id' }],
                        },
                    ],
                    arguments: { id: '1' },
                },
            ],
        })
    })

    it('respects includeFieldPath option', async () => {
        const data = await graphql(schema, aliasQuery, null, {}, { id: 1 })
        expect(info).toBeDefined()
        if (data.errors) {
            throw new Error('graphql error(s):\n' + JSON.stringify(data.errors))
        }
        expect(
            graphqlOperationToPOJO(info, { includeFieldPath: true })
        ).toEqual({
            operation: 'query',
            fields: [
                {
                    name: 'user',
                    path: 'user',
                    fields: [
                        {
                            name: 'widgets',
                            alias: 'aliasForWidgets',
                            path: 'user.aliasForWidgets',
                            fields: [
                                { name: 'id', path: 'user.aliasForWidgets.id' },
                            ],
                        },
                    ],
                    arguments: { id: '1' },
                },
            ],
        })
    })

    it('respects includeReturnTypes option', async () => {
        const data = await graphql(schema, aliasQuery, null, {}, { id: 1 })
        expect(info).toBeDefined()
        if (data.errors) {
            throw new Error('graphql error(s):\n' + JSON.stringify(data.errors))
        }
        const userType = schema.getType('User')
        expect(
            graphqlOperationToPOJO(info, { includeReturnTypes: true })
        ).toEqual({
            operation: 'query',
            fields: [
                {
                    name: 'user',
                    returnType: userType,
                    fields: [
                        {
                            name: 'widgets',
                            alias: 'aliasForWidgets',
                            returnType: userType.getFields()['widgets'].type,
                            fields: [{ name: 'id' }],
                        },
                    ],
                    arguments: { id: '1' },
                },
            ],
        })
    })
})
