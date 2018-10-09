/**
 * This is the Star Wars schema used in all of the interactive GraphiQL
 * examples on GraphQL.org. License reproduced at the bottom.
 *
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */
module.exports = `
schema {
  query: Query
  mutation: Mutation
}
# The query type, represents all of the entry points into our object graph
type Query {
  hero(episode: Episode): Character
  reviews(episode: Episode!): [Review]
  search(text: String): [SearchResult]
  character(id: ID!): Character
  droid(id: ID!): Droid
  human(id: ID!): Human
  starship(id: ID!): Starship
}
# The mutation type, represents all updates we can make to our data
type Mutation {
  createReview(episode: Episode, review: ReviewInput!): Review
}
# The episodes in the Star Wars trilogy
enum Episode {
  # Star Wars Episode IV: A New Hope, released in 1977.
  NEWHOPE
  # Star Wars Episode V: The Empire Strikes Back, released in 1980.
  EMPIRE
  # Star Wars Episode VI: Return of the Jedi, released in 1983.
  JEDI
}
# A character from the Star Wars universe
interface Character {
  # The ID of the character
  id: ID!
  # The name of the character
  name: String!
  # The friends of the character, or an empty list if they have none
  friends: [Character]
  # The friends of the character exposed as a connection with edges
  friendsConnection(first: Int, after: ID): FriendsConnection!
  # The movies this character appears in
  appearsIn: [Episode]!
}
# Units of height
enum LengthUnit {
  # The standard unit around the world
  METER
  # Primarily used in the United States
  FOOT
}
# A humanoid creature from the Star Wars universe
type Human implements Character {
  # The ID of the human
  id: ID!
  # What this human calls themselves
  name: String!
  # Height in the preferred unit, default is meters
  height(unit: LengthUnit = METER): Float
  # Mass in kilograms, or null if unknown
  mass: Float
  # This human's friends, or an empty list if they have none
  friends: [Character]
  # The friends of the human exposed as a connection with edges
  friendsConnection(first: Int, after: ID): FriendsConnection!
  # The movies this human appears in
  appearsIn: [Episode]!
  # A list of starships this person has piloted, or an empty list if none
  starships: [Starship]
}
# An autonomous mechanical character in the Star Wars universe
type Droid implements Character {
  # The ID of the droid
  id: ID!
  # What others call this droid
  name: String!
  # This droid's friends, or an empty list if they have none
  friends: [Character]
  # The friends of the droid exposed as a connection with edges
  friendsConnection(first: Int, after: ID): FriendsConnection!
  # The movies this droid appears in
  appearsIn: [Episode]!
  # This droid's primary function
  primaryFunction: String
}
# A connection object for a character's friends
type FriendsConnection {
  # The total number of friends
  totalCount: Int
  # The edges for each of the character's friends.
  edges: [FriendsEdge]
  # A list of the friends, as a convenience when edges are not needed.
  friends: [Character]
  # Information for paginating this connection
  pageInfo: PageInfo!
}
# An edge object for a character's friends
type FriendsEdge {
  # A cursor used for pagination
  cursor: ID!
  # The character represented by this friendship edge
  node: Character
}
# Information for paginating this connection
type PageInfo {
  startCursor: ID
  endCursor: ID
  hasNextPage: Boolean!
}
# Represents a review for a movie
type Review {
  # The number of stars this review gave, 1-5
  stars: Int!
  # Comment about the movie
  commentary: String
}
# The input object sent when someone is creating a new review
input ReviewInput {
  # 0-5 stars
  stars: Int!
  # Comment about the movie, optional
  commentary: String
}
type Starship {
  # The ID of the starship
  id: ID!
  # The name of the starship
  name: String!
  # Length of the starship, along the longest axis
  length(unit: LengthUnit = METER): Float
}
union SearchResult = Human | Droid | Starship
`

/*
License from https://github.com/graphql/graphql.github.io/blob/source/LICENSE

LICENSE AGREEMENT For graphql.org software

Facebook, Inc. (“Facebook”) owns all right, title and interest, including all
intellectual property and other proprietary rights, in and to the graphql.org
software. Subject to your compliance with these terms, you are hereby granted a
non-exclusive, worldwide, royalty-free copyright license to (1) use and copy the
graphql.org software; and (2) reproduce and distribute the graphql.org software
as part of your own software (“Your Software”). Facebook reserves all rights not
expressly granted to you in this license agreement.

THE SOFTWARE AND DOCUMENTATION, IF ANY, ARE PROVIDED "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES (INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE) ARE DISCLAIMED. IN NO
EVENT SHALL FACEBOOK OR ITS AFFILIATES, OFFICES, DIRECTORS OR EMPLOYEES BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

You will include in Your Software (e.g., in the file(s), documentation or other
materials accompanying your software): (1) the disclaimer set forth above; (2)
this sentence; and (3) the following copyright notice:

Copyright (c) 2015, Facebook, Inc. All rights reserved.
*/
