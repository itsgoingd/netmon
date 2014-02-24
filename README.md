Netmon
======

**Netmon** is a simple bandwidth and latency monitor for cheap home routers written in Node.js. Netmon uses SNMP to collect the bandwidth data and optionally the system ping command to collect latency data and presents them via a simple web or cli UI.

![](https://dl.dropboxusercontent.com/s/yoooz82u723k6b4/Screenshot%202014-02-24%2002.08.46.png)

## Installation

```sh
$ git clone https://github.com/itsgoingd/netmon.git netmon
$ cd netmon
$ npm install
$ node app.js --web --ping google.com
```

## Options

### General

- **--web** - start the web UI (default port 3111)
- **--cli** - start the cli UI

- **--ping hostname** - collect latency data for the specified hostname (can be used more than once)

- **--delay** - delay when collecting the data from SNMP in seconds (default 1 second)
- **--ping-delay** - delay when collecting the latency data by ping in seconds (default 5 * delay)
- **--gateway hostname** - hostname of the monitored router (defaults to system default gateway)

### Web

- **--port** - listen on a custom port

## Licence

Copyright (c) 2014 Miroslav Rigler

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
