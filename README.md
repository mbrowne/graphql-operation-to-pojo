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
