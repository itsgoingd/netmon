/*
 * netmon
 *
 * a simple network monitor
 */

var Netmon = (function(){

	var Netmon = function()
	{
		this.args = require('minimist')(process.argv);

		this.delay = this.args.delay || 1;

		var gateway = this.args.gateway || 'default';
		this.router = new Router(gateway, this.delay);

		var hosts = this.args.ping || [];
		var ping_delay = this.args['ping-delay'] || this.delay * 5;
		this.pinger = new Pinger(hosts, ping_delay);

		if (this.args.cli)
			this.startCliUi();

		if (this.args.web)
			this.startWebUi();
	};

	Netmon.prototype.cliPrintCurrent = function()
	{
		console.log(
			"RX: " + Math.abs(Math.round(this.router.rx_rates.last() / 1024 * 100) / 100) + " kBps (" + Math.round(this.router.rx.last() / 1024 / 1024 * 100) / 100 + " MB)   " +
			"TX: " + Math.abs(Math.round(this.router.tx_rates.last() / 1024 * 100) / 100) + " kBps (" + Math.round(this.router.tx.last() / 1024 / 1024 * 100) / 100 + " MB)"
		);

		if (this.pinger) {
			var ping_text = "Ping:";

			this.pinger.hosts.forEach(function(host)
			{
				ping_text += ' ' + host + ' ' + (this.pinger.pings[host].last()) + ' ms';
			}.bind(this));

			console.log(ping_text);
		}
	};

	Netmon.prototype.startCliUi = function()
	{
		setInterval(function(){
			this.cliPrintCurrent();
		}.bind(this), this.delay * 1000);
	};

	Netmon.prototype.startWebUi = function()
	{
		var express = require('express');

		var web = express();

		web.use(express.static(__dirname + '/web'));

		web.get('/', function(req, res)
		{
			res.sendfile('index.html');
		});

		web.get('/data', function(req, res)
		{
			var data = {
				info: {
					name:       this.router.name,
					ip_address: this.router.ip_address,
					uptime:     this.router.uptime,
					delay:      this.router.delay,
					rx_top:     this.router.rx_top,
					tx_top:     this.router.tx_top
				},
				rates: {
					rx: this.router.rx_rates,
					tx: this.router.tx_rates
				},
				ping: this.pinger.pings
			};

			res.status(200);
			res.header("Content-Type", "application/json");
			res.header("Access-Control-Allow-Origin", "*");
			res.write(JSON.stringify(data));
			res.end();
		}.bind(this));

		var listen_port = this.args.port || 3111;

		web.listen(listen_port);
	};

	return Netmon;

})();

var Router = (function(){

	var Router = function(ip_address, delay)
	{
		this.ip_address = ip_address;

		if (this.ip_address === undefined || this.ip_address == 'default')
			this.ip_address = Router.getDefaultIpAddress();

		this.delay = delay;

		this.snmp = new (require('snmp-native')).Session({ host: this.ip_address, community: 'public' });

		this.rx = [];
		this.tx = [];

		this.rx_rates = [1];
		this.tx_rates = [1];

		this.rx_top = 0;
		this.tx_top = 0;

		this.refresh();

		setInterval(function()
		{
			this.refresh();
		}.bind(this), this.delay * 1000);
	};

	Router.prototype.addRxValue = function(rx_current)
	{
		var rx_last = this.rx.last();

		this.rx.push(rx_current);

		if (this.rx.length > 1024)
			this.rx.shift();

		if (rx_current < rx_last) // counter was reset, avoid computing negative rate
			return;

		this.rx_rates.push((rx_current - rx_last) / this.delay);

		if (this.rx_rates.length > 1024)
			this.rx_rates.shift();

		if (this.rx_rates.last() > this.rx_top)
			this.rx_top = this.rx_rates.last();
	};

	Router.prototype.addTxValue = function(tx_current)
	{
		var tx_last = this.tx.last();

		this.tx.push(tx_current);

		if (this.tx.length > 1024)
			this.tx.shift();

		if (tx_current < tx_last) // counter was reset, avoid computing negative rate
			return;

		this.tx_rates.push((tx_current - tx_last) / this.delay);

		if (this.tx_rates.length > 1024)
			this.tx_rates.shift();
		if (this.tx_rates.last() > this.tx_top)
			this.tx_top = this.tx_rates.last();
	};

	Router.prototype.refresh = function()
	{
		var oids = [
			[1, 3, 6, 1, 2, 1, 1, 1, 0],        // SNMPv2-MIB::sysDescr.0
			[1, 3, 6, 1, 2, 1, 1, 3, 0],        // DISMAN-EVENT-MIB::sysUpTimeInstance
			[1, 3, 6, 1, 2, 1, 2, 2, 1, 10, 1], // IF-MIB::ifInOctets.1
			[1, 3, 6, 1, 2, 1, 2, 2, 1, 16, 1]  // IF-MIB::ifOutOctets.1
		];

		this.snmp.getAll({ oids: oids }, function (error, varbinds)
		{
			varbinds.forEach(function (vb)
			{
				if (vb.oid == '1,3,6,1,2,1,1,1,0')           // SNMPv2-MIB::sysDescr.0
					this.name = vb.value;
				else if (vb.oid == '1,3,6,1,2,1,1,3,0')      // DISMAN-EVENT-MIB::sysUpTimeInstance
					this.uptime = vb.value;
				else if (vb.oid == '1,3,6,1,2,1,2,2,1,10,1') // IF-MIB::ifInOctets.1
					this.addRxValue(vb.value);
				else                                         // IF-MIB::ifOutOctets.1
					this.addTxValue(vb.value);
			}.bind(this));
		}.bind(this));
	};

	Router.getDefaultIpAddress = function()
	{
		return require('netroute').getGateway();
	};

	return Router;

})();

var Pinger = (function()
{

	var Pinger = function(hosts, delay)
	{
		if (!(hosts instanceof Array)) {
			hosts = [hosts];
		}

		this.delay = delay;
		this.hosts = hosts;
		this.pings = {};

		this.regexp = new RegExp('[0-9]+? bytes from [A-Za-z0-9.]+?: icmp_seq=[0-9]+? ttl=[0-9]+? time=([0-9.]+?) ms');

		this.hosts.forEach(function(host)
		{
			this.pings[host] = [0];
			this.ping(host);
		}.bind(this));
	};

	Pinger.prototype.ping = function(host)
	{
		var spawn = require('child_process').spawn;

		var ping = spawn('ping', ['-i' + this.delay, '-W' + this.delay * 1000, host]);

		ping.stdout.on('data', function(data)
		{
			var matches = data.toString().match(this.regexp);

			if (!matches) { // ping failed
				this.addLatencyValue(host, 0);
			} else {
				this.addLatencyValue(host, parseFloat(matches[1]));
			}
		}.bind(this));

		ping.on('close', function(code)
		{
			this.ping(host);
		}.bind(this));
	};

	Pinger.prototype.addLatencyValue = function(host, value)
	{
		this.pings[host].push(value);

		if (this.pings[host] > 1024)
			this.pings[host].shift();
	};

	return Pinger;

})();

Array.prototype.last = function()
{
	return this[this.length - 1];
};


var app = new Netmon();
