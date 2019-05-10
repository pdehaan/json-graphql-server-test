const express = require('express');
const got = require("got").get;
const jsonGraphqlExpress = require('json-graphql-server').default;

const PORT = 3000;
const app = express();

main(app);

async function main(app) {
  const breaches = await loadData();
  console.log(`Found ${breaches.length} breaches`);

  app.get("/", async (req, res) => {
    const recentBreaches = await getRecentBreaches(req.query.count);
    res.json(recentBreaches);
  });
  app.get("/breaches/:name", async (req, res) => {
    const breach = await getBreach(req.params.name);
    res.json(breach);
  });
  app.use('/graphql', jsonGraphqlExpress({ breaches }));
  
  const server = app.listen(PORT, () => {
    console.log(`Server on http://localhost:${PORT}`);
    console.log(server.address());
  });
}

async function getBreach(id) {
  const res = await query(`{Breach(id:"${id.toLowerCase()}"){Name,Title,Domain,DataClasses,AddedDate,PwnCount}}`);
  return res.Breach;
}

async function getRecentBreaches(count=10) {
  const res = await query(`{allBreaches(sortField:"AddedDate",sortOrder:"desc",perPage:${count},page:0){id,AddedDate,BreachDate,Domain}}`);
  return res.allBreaches;
}

async function loadData() {
  const {body} = await got("https://monitor.firefox.com/hibp/breaches", {json:true});
  // Inject a required(?) `id` property on each breach record.
  return body.map(breach => ({id: breach.Name.toLowerCase(), ...breach}));
}

async function query(graphqlQuery) {
  const {body} = await got(`http://localhost:3000/graphql/`, {
    query: {query: graphqlQuery},
    json: true
  });
  return body.data;
}


// You can retrieve records by `id` using the `Breach(id:"foo")` syntax below:
// $ http "http://localhost:3000/graphql/?query={Breach(id:\"LinkedIn\"){Name,Title,Domain,DataClasses,AddedDate,PwnCount}}"

// You can retrieve all breach records by using the `allBreaches` target:
// /graphql/?query={allBreaches{Name,Title,Domain,AddedDate,PwnCount}}"

// All breaches sorted by `AddedDate` (descending order, newest first):
// /graphql/?query={allBreaches(sortField:"AddedDate",sortOrder:"desc"){id,AddedDate,Domain}}

// Ten most recent breaches (using paging):
// /graphql/?query={allBreaches(sortField:"AddedDate",sortOrder:"desc",perPage:10,page:0){id,AddedDate,Domain}}

/*
{
  allBreaches(filter: {IsSensitive: false, IsVerified: true, IsRetired: false, IsFabricated: false, ids:["adobe", "linkedin"]}) {
    Name
    AddedDate
    Domain
  }
}


{allBreaches(
  sortField: "PwnCount",
  sortOrder: "desc",
  filter: {
    IsFabricated: false,
    IsRetired: false,
    IsVerified: true,
  }
) {
	Name
  Domain
  PwnCount
  AddedDate
  DataClasses
  LogoPath
  IsSensitive
  IsSpamList
}}
*/
