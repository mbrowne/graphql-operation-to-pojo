/**
 * This defines a basic set of data for our Star Wars Schema.
 *
 * This data is hard coded for the sake of the demo, but you could imagine
 * fetching this data from a backend service rather than from hardcoded
 * JSON objects in a more complex demo.
 */

const humans = [
    {
        id: '1000',
        name: 'Luke Skywalker',
        friends: ['1002', '1003', '2000', '2001'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        height: 1.72,
        mass: 77,
        starships: ['3001', '3003'],
    },
    {
        id: '1001',
        name: 'Darth Vader',
        friends: ['1004'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        height: 2.02,
        mass: 136,
        starships: ['3002'],
    },
    {
        id: '1002',
        name: 'Han Solo',
        friends: ['1000', '1003', '2001'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        height: 1.8,
        mass: 80,
        starships: ['3000', '3003'],
    },
    {
        id: '1003',
        name: 'Leia Organa',
        friends: ['1000', '1002', '2000', '2001'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        height: 1.5,
        mass: 49,
        starships: [],
    },
    {
        id: '1004',
        name: 'Wilhuff Tarkin',
        friends: ['1001'],
        appearsIn: ['NEWHOPE'],
        height: 1.8,
        mass: null,
        starships: [],
    },
]

const humanData = {}
humans.forEach((ship) => {
    humanData[ship.id] = ship
})

const droids = [
    {
        id: '2000',
        name: 'C-3PO',
        friends: ['1000', '1002', '1003', '2001'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        primaryFunction: 'Protocol',
    },
    {
        id: '2001',
        name: 'R2-D2',
        friends: ['1000', '1002', '1003'],
        appearsIn: ['NEWHOPE', 'EMPIRE', 'JEDI'],
        primaryFunction: 'Astromech',
    },
]

const droidData = {}
droids.forEach((ship) => {
    droidData[ship.id] = ship
})

const starships = [
    {
        id: '3000',
        name: 'Millenium Falcon',
        length: 34.37,
    },
    {
        id: '3001',
        name: 'X-Wing',
        length: 12.5,
    },
    {
        id: '3002',
        name: 'TIE Advanced x1',
        length: 9.2,
    },
    {
        id: '3003',
        name: 'Imperial shuttle',
        length: 20,
    },
]

const starshipData = {}
starships.forEach((ship) => {
    starshipData[ship.id] = ship
})

/**
 * Helper function to get a character by ID.
 */
function getCharacter(id) {
    // Returning a promise just to illustrate GraphQL.js's support.
    return Promise.resolve(humanData[id] || droidData[id])
}

/**
 * Allows us to fetch the undisputed hero of the Star Wars trilogy, R2-D2.
 */
function getHero(episode) {
    if (episode === 'EMPIRE') {
        // Luke is the hero of Episode V.
        return humanData['1000']
    }
    // Artoo is the hero otherwise.
    return droidData['2001']
}

/**
 * Allows us to query for the human with the given id.
 */
function getHuman(id) {
    return humanData[id]
}

/**
 * Allows us to query for the droid with the given id.
 */
function getDroid(id) {
    return droidData[id]
}

function getStarship(id) {
    return starshipData[id]
}

function toCursor(str) {
    return Buffer('cursor' + str).toString('base64')
}

function fromCursor(str) {
    return Buffer.from(str, 'base64').toString().slice(6)
}

const resolvers = {
    Query: {
        hero: (root, { episode }) => getHero(episode),
        character: (root, { id }) => getCharacter(id),
        human: (root, { id }) => getHuman(id),
        droid: (root, { id }) => getDroid(id),
        starship: (root, { id }) => getStarship(id),
        reviews: () => null,
        search: (root, { text }) => {
            const re = new RegExp(text, 'i')

            const allData = [...humans, ...droids, ...starships]

            return allData.filter((obj) => re.test(obj.name))
        },
    },
    Mutation: {
        createReview: (root, { episode, review }) => review,
    },
    Character: {
        __resolveType(data, context, info) {
            if (humanData[data.id]) {
                return info.schema.getType('Human')
            }
            if (droidData[data.id]) {
                return info.schema.getType('Droid')
            }
            return null
        },
    },
    Human: {
        height: ({ height }, { unit }) => {
            if (unit === 'FOOT') {
                return height * 3.28084
            }

            return height
        },
        friends: ({ friends }) => friends.map(getCharacter),
        friendsConnection: ({ friends }, { first, after }) => {
            first = first || friends.length
            after = after ? parseInt(fromCursor(after), 10) : 0
            const edges = friends
                .map((friend, i) => ({
                    cursor: toCursor(i + 1),
                    node: getCharacter(friend),
                }))
                .slice(after, first + after)
            const slicedFriends = edges.map(({ node }) => node)
            return {
                edges,
                friends: slicedFriends,
                pageInfo: {
                    startCursor: edges.length > 0 ? edges[0].cursor : null,
                    hasNextPage: first + after < friends.length,
                    endCursor:
                        edges.length > 0
                            ? edges[edges.length - 1].cursor
                            : null,
                },
                totalCount: friends.length,
            }
        },
        starships: ({ starships }) => starships.map(getStarship),
        appearsIn: ({ appearsIn }) => appearsIn,
    },
    Droid: {
        friends: ({ friends }) => friends.map(getCharacter),
        friendsConnection: ({ friends }, { first, after }) => {
            first = first || friends.length
            after = after ? parseInt(fromCursor(after), 10) : 0
            const edges = friends
                .map((friend, i) => ({
                    cursor: toCursor(i + 1),
                    node: getCharacter(friend),
                }))
                .slice(after, first + after)
            const slicedFriends = edges.map(({ node }) => node)
            return {
                edges,
                friends: slicedFriends,
                pageInfo: {
                    startCursor: edges.length > 0 ? edges[0].cursor : null,
                    hasNextPage: first + after < friends.length,
                    endCursor:
                        edges.length > 0
                            ? edges[edges.length - 1].cursor
                            : null,
                },
                totalCount: friends.length,
            }
        },
        appearsIn: ({ appearsIn }) => appearsIn,
    },
    FriendsConnection: {
        edges: ({ edges }) => edges,
        friends: ({ friends }) => friends,
        pageInfo: ({ pageInfo }) => pageInfo,
        totalCount: ({ totalCount }) => totalCount,
    },
    FriendsEdge: {
        node: ({ node }) => node,
        cursor: ({ cursor }) => cursor,
    },
    Starship: {
        length: ({ length }, { unit }) => {
            if (unit === 'FOOT') {
                return length * 3.28084
            }

            return length
        },
    },
    SearchResult: {
        __resolveType(data, context, info) {
            if (humanData[data.id]) {
                return info.schema.getType('Human')
            }
            if (droidData[data.id]) {
                return info.schema.getType('Droid')
            }
            if (starshipData[data.id]) {
                return info.schema.getType('Starship')
            }
            return null
        },
    },
}

module.exports = resolvers
