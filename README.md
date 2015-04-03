Realtime collaboration editor - EventServer
===========================================

This project was done as a part of team engineering project at the university. Whole app was just a simple website that allowed users to register and share documents to work on them in parallel. My responsibility was to write an event server that would be responsible for propagation of changes between users.

If You are interested in apps like that see this [Pusher blog post][pusher]. Now instead of using their's service we decided to roll our own.

## How to run
1. Install **redis**
	- for linux see [redis.io/download]
	- for windows use [MSOpenTech/Redis][MSOpenTech/Redis] ( see bin/release for executable)
2. run `npm install`
3. start the redis service: `redis­-server`
4. start the app: `node bin/www`

Other start modes:
- `node bin/www e2e` - for use in integration tests
- `node bin/www diagnostic` - start with HTML server for diagnostic app

#### utils:
- grunt-cli: `npm install ­-g grunt-­cli`
- jshint: `npm install ­-g jshint`

#### running utils:
- `grunt jshint` - code style inspection
- `grunt jsdoc:generate` - generate docs
- `grunt e2e` - run integration tests
- `grunt mocha` - run unit tests
- `grunt coverage` - generate coverage report


## Configuration

see [config file](config.js)

|  key          | type   | default      | description                   |
|---------------|:------:|:------------:|-------------------------------|
| socketOnly    | bool   | false        | start HTML server?            |
| appPort       | int    | 3000         | port to use for debug app     |
| socketPort    | int    | 8082         | port to use for our service   |
| socketHost    | string | localhost    | our host                      |
| redisPort     | int    | 6379         | port of redis instance        |
| redisHost     | string | localhost    | host of redis instance        |
| secretKey     | string | -            | key to use for auth. purposes |
| skipValidation| bool   | false        | *use only for tests*    		|
| logFilePath   | string | log/main.log | log file                      |
| logLevel      | string | debug        | log level: "debug", "verbose",<br/>"info", "warn", "error"|

## Integration testing

[code](test/e2e/e2e.js)

Just a quick test in diagnostic environment. Move cursor on the page, write something, wait for event propagation, check if changes are visible.

1. start **redis**
2. run `node bin/www e2e`
3. run `grunt e2e`

## Unit testing

Only the crucial files were tested, but with low effort this allowed us to keep the code coverage at ~91%.

- [pipeline](test/specs/pipeline.spec.js)
- [redis-adapter](test/specs/redis-adapter.spec.js)
- [socket-handler](test/specs/socket-handler.spec.js)

## Event store

>Hey, guys ! I've got the idea. If all the events pass through this *event server* couldn't You just **store all the events** in the database, so that You could **rewind the document to _every_ past state** ?

Well, we' ve tried. Really. See the **phantom-storage-s** branch, especially:
- [event storage](https://github.com/Scthe/RTCollaborationEditor_EventServer/blob/phantom-storage-s/server%2Fstorage%2Fdatabase_adapter.js)
- [phantomJS adapter](https://github.com/Scthe/RTCollaborationEditor_EventServer/blob/phantom-storage-s/server%2Fstorage%2Fphantom_adapter.js)
- [snapshot controller](https://github.com/Scthe/RTCollaborationEditor_EventServer/blob/phantom-storage-s/server%2Fstorage%2Fsnapshot_factory.js)

Due too not production-ready state of the frontend we had to use PhantomJS to replay the events server side. This lead to a couple of problems:
- PhantomJS is not as stable as one may think
- PhantomJS instance requires too much resources to run
- suddenly we were working across several processes
- the code was not that hard, but distinguishing which part of the code runs in Node, which in the driver and which in the Phantom's browser environment.. ( well, that part was actually really awesome to write but not so much to read)

## Used technology
core:
- **Node.js**
- **Redis** - queue + cache implementation
- **Socket.IO**
- **jsonwebtoken** - auth
- **q** - all async management
- **underscore** <3
- **winston**

utils:
- **express** - only used for debugging page
- **jade** - only used for debugging page
- **codemirror** - only used for debugging page ( our team used custom editor)
- **grunt**
- **jshint**
- **jsdoc**

tests:
- **mocha**
- **chai**
- **sinon**
- **faker**
- **proxyquire** <3
- **istanbul**
- **casper.js** - used in integration testing

[redis.io/download]:http://redis.io/download
[MSOpenTech/Redis]:https://github.com/MSOpenTech/Redis
[pusher]:https://blog.pusher.com/how-we-built-atom-pair/
