# indigov

To run the project:

1. Checkout and install dependencies: `npm install`
2. Run SQLite migrations: `npm run migrate`
3. Start the server: `npm run dev`
4. **(optional)** Run tests: `npm test`

Core implementation is in [src/index.ts](src/index.ts).

## API

### List constituents

**`GET /constituents`**

Query Parameters:

- `limit` (optional): The number of records to return per page. Default is 25.
- `offset` (optional): The number of records to skip. Default is 0.
- `sort` (optional): The field to sort by. Default is `created_at`.
- `order` (optional): The order to sort by. Default is `desc`.
- `format` (optional): The format to return the data in. Default is `json`.

### Create a new constituent

**`POST /constituents`**

Request Body:

```json
{
  "email": "email@here.com",
  "name": "name",
  "phone": "123-456-7890",
  "address": "1234 Elm St, Springfield, IL 62701",
}
```

### Export constituents as CSV

**`GET /constituents?format=csv`**

Query Parameters:

- `created_at` (optional): The time frame to filter by. Default is all time. Can be < or > a date in ISO format.

Example: `GET /constituents?format=csv&created_at=>2021-01-01T00:00:00.000Z`

## Thought Process and Spec

**Note: This was written before implementation**

The first thing I want to do to understand and spec the project is design the API. This helps me understand the data structure and data flow. Stepping through the requirements, we have:

### 1. List all the constituents that are currently in the system

This makes sense as a GET request to `/constituents`. The response should be a list of all constituents in the system.
Additionally, it should allow for query parameters for pagination, sorting, and filtering.

Naively, this will look like:

**`GET /constituents`:**

```json
[
  {
    "id": 1234,
    "email": "john.doe@email.com",
    "name": "John Doe",
    "phone": "123-456-7890",
    "address": "1234 Elm St, Springfield, IL 62701",
    "created_at": "2021-01-01T00:00",
    "updated_at": "2021-01-01T00:00",
    "unsubscribed_at": null
  },
]
```

**Query Parameters:**

- `limit` (optional): The number of records to return per page. Default is 25.
- `offset` (optional): The number of records to skip. Default is 0.
- `sort` (optional): The field to sort by. Default is `created_at`.
- `order` (optional): The order to sort by. Default is `desc`.

### 2. Submit new constituent contact data (without creating duplicates)

This fits as a POST request to the same endpoint, `/constituents`. The request body should be a JSON object with the constituent data. The response should be the constituent data that was submitted. Additional middleware here might check for authentication, and the endpoint should validate + deduplicate the data.

**`POST /constituents`:**

Request Body:

```json
{
  "email": "JOHN.DOE@email.com",
  "name": "John Doe",
  "phone": "123-456-7890",
  "address": "1234 Elm St, Springfield, IL 62701",
}
```

Response:

```json
{
  "id": 1234,
  "email": "john.doe@email.com",
  "name": "John Doe",
  "phone": "123-456-7890",
  "address": "1234 Elm St, Springfield, IL 62701",
}
```

### 3. Export a csv file of constituent contact data filtered by sign up time

The first question here is what "filtered" means. It could either mean "ordered by", or "only include constituents that signed up within a certain time frame". Since I can leverage a datastore that orders by sign up time by default, I will aim to implement both, since I only need to spend time on one.

As a consumer, I would expect this to be a GET request. The decision to be made is whether to use a new endpoint specifically for CSV export, or to use a modification of the existing `/constituents` endpoint to return CSV formatted data, vs JSON formatted data. 

Personally, as a bit of a REST purist, I would prefer the same endpoint but with a csv modifier parameter, like `/constituents?format=csv`. However, the tradeoff then lies in cleanly implementing the formatted data in the function that handles the request.

For now I will try to do it this way, and if it becomes too complex, I will create a new endpoint.

## Implementation

The requirements for the project can be implemented very quickly with off-the-shelf tools like Remix, for example. However, I feel like that would complicate the unecessary parts while obscuring the necessary parts of the implementation. So in order to show my work and step through a solution, I'll use more light-weight tooling that still manages complexity nicely.

What makes sense for this project is:

- [Hono](https://hono.dev/) for serving the web requests/API
- SQLite for storing data, using [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [zod](https://zod.dev/) for data validation
- [vitest](https://vitest.dev) for testing

Cloudflare Workers provides [D1](https://developers.cloudflare.com/d1/) as a SQLite service, and Hono was built natively to work with Cloudflare Workers. This lets me leverage their [wrangler](https://developers.cloudflare.com/workers/wrangler/) project tool to manage project structure, local development, and testing tooling.
