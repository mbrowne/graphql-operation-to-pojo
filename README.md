# graphql-operation-to-pojo

Converts GraphQL operations to plain old JS objects (POJOs), ready to to be serialized to JSON.

This can be used to parse the `info` argument (`GraphQLResolveInfo`) passed to GraphQL resolvers.

## Installation

```bash
npm i -S graphql-operation-to-pojo
```

Or:

```bash
yarn add graphql-operation-to-pojo
```

## Usage

```js
myResolver(obj, args, context, info) {
    const queryPOJO = graphqlOperationToPOJO(info)
    ...
}
```

There is also a helper function to serialize the result to a JSON string:

```js
const jsonString = graphqlOperationToJSON(info)
```

(This is equivalent to calling `JSON.stringify(graphqlOperationToPOJO(info))`)

### Options

Options can optionally be passed as a second argument, e.g.:

```js
graphqlOperationToPOJO(info, {
    includeFieldPath: true,
    includeReturnType: true
})
```

Available options:

-   `includeFieldPath`: boolean (defaults to false)

    If true, a `path` property will be added to each field object and set to the path to the field from the root of the query, e.g. `'hero.name'`

-   `includeReturnTypes`: boolean (defaults to false)

    If true, the return type of each field will be included in the result.

> Tip:
> When using `includeReturnTypes`, you can use `getNamedType()` from graphql.js to strip any wrapping non-null or list types and get the underlying type. For example:
>
> ```lang-js
> import { getNamedType } from 'graphql'
> ...
> /*
> Suppose we're running a query that returns a list of users:
>
>   type Query {
>     users: [User!]!
>   }
> */
> const returnType = getNamedType(queryPojo.fields[0].returnType)
> console.log(returnType.toString())
> // Output: 'User'
> ```

</code>

## Examples

Given the query:

```graphql
query {
    hero(episode: NEWHOPE) {
        name
        friends {
            name
            appearsIn
        }
    }
}
```

`graphqlOperationToPOJO` will return:

```json
{
    "operation": "query",
    "fields": [
        {
            "name": "hero",
            "fields": [
                {
                    "name": "name"
                },
                {
                    "name": "friends",
                    "fields": [
                        {
                            "name": "name"
                        },
                        {
                            "name": "appearsIn"
                        }
                    ]
                }
            ],
            "arguments": {
                "episode": "NEWHOPE"
            }
        }
    ]
}
```

### Aliases

If the query contains aliases, the field object will include an `alias` property, e.g.:

```graphql
{
    hero(episode: NEWHOPE) {
        heroName: name
    }
}
```

```json
{
    "operation": "query",
    "fields": [
        {
            "name": "hero",
            "fields": [
                {
                    "name": "name",
                    "alias": "heroName"
                }
            ],
            "arguments": {
                "episode": "NEWHOPE"
            }
        }
    ]
}
```

### Fragments

Type conditions for fragments are stored in a `fragmentType` property, e.g.:

```graphql
{
    character(id: "1000") {
        ... on Human {
            id
            name
            friends {
                id
            }
        }
        ... on Droid {
            name
            friends {
                name
            }
        }
    }
}
```

```json
{
    "operation": "query",
    "fields": [
        {
            "name": "character",
            "fields": [
                {
                    "name": "id",
                    "fragmentType": "Human"
                },
                {
                    "name": "name",
                    "fragmentType": "Human"
                },
                {
                    "name": "friends",
                    "fragmentType": "Human",
                    "fields": [
                        {
                            "name": "id"
                        }
                    ]
                },
                {
                    "name": "name",
                    "fragmentType": "Droid"
                },
                {
                    "name": "friends",
                    "fragmentType": "Droid",
                    "fields": [
                        {
                            "name": "name"
                        }
                    ]
                }
            ],
            "arguments": {
                "id": "1000"
            }
        }
    ]
}
```
