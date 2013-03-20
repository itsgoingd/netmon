/*
 * netmon
 *
 * a simple network monitor
 */

var Netmon = (function(){

	var Netmon = function()
	{
		this.delay = 1;
		this.router = new Router('default', this.delay);

		if (process.argv.indexOf('--cli') !== -1)
			this.startCliUi();

		if (process.argv.indexOf('--web') !== -1)
			this.startWebUi();
	};

	Netmon.prototype.cliPrintCurrent = function()
	{
		console.log(
			"RX: " + Math.abs(Math.round(this.router.rx_rates.last() / 1024 * 100) / 100) + " kBps (" + Math.round(this.router.rx.last() / 1024 / 1024 * 100) / 100 + " MB)   " +
			"TX: " + Math.abs(Math.round(this.router.tx_rates.last() / 1024 * 100) / 100) + " kBps (" + Math.round(this.router.tx.last() / 1024 / 1024 * 100) / 100 + " MB)"
		);
	};

	Netmon.prototype.startCliUi = function()
	{
		var that = this;
		setInterval(function(){
			that.cliPrintCurrent();
		}, this.delay * 1000);
	};

	Netmon.prototype.startWebUi = function()
	{
		var express = require('express');

		var web = express();

		web.use(express.static(__dirname + '/web'));

		web.get('/', function(req, res){
			res.sendfile('index.html');
		});

		var that = this;
		web.get('/data', function(req, res){
			var data = {
				info: {
					name:       that.router.name,
					ip_address: that.router.ip_address,
					uptime:     that.router.uptime,
					delay:      that.router.delay,
					rx_top:     that.router.rx_top,
					tx_top:     that.router.tx_top
				},
				data: {
					rx: that.router.rx_rates,
					tx: that.router.tx_rates
				}
			};

			res.status(200);
			res.header("Content-Type", "application/json");
			res.header("Access-Control-Allow-Origin", "*");
			res.write(JSON.stringify(data));
			res.end();
		});

		var listen_port = 3111;

		if (process.argv.indexOf('--port') !== -1)
			listen_port = process.argv[process.argv.indexOf('--port') + 1];

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

		var that = this;
		setInterval(function(){
			that.refresh();
		}, this.delay * 1000);
	};

	Router.prototype.addRxValue = function(value)
	{
		this.rx.push(value);

		if (this.rx.length > 1024)
			this.rx.shift();

		this.rx_rates.push((this.rx.last() - this.rx[this.rx.length -2]) / this.delay);

		if (this.rx_rates.length > 1024)
			this.rx_rates.shift();

		if (this.rx_rates.last() > this.rx_top)
			this.rx_top = this.rx_rates.last();
	};

	Router.prototype.addTxValue = function(value)
	{
		this.tx.push(value);

		if (this.tx.length > 1024)
			this.tx.shift();

		this.tx_rates.push((this.tx.last() - this.tx[this.tx.length -2]) / this.delay);

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

		var that = this;
		this.snmp.getAll({ oids: oids }, function (error, varbinds){
			varbinds.forEach(function (vb){
				if (vb.oid == '1,3,6,1,2,1,1,1,0')           // SNMPv2-MIB::sysDescr.0
					that.name = vb.value;
				else if (vb.oid == '1,3,6,1,2,1,1,3,0')      // DISMAN-EVENT-MIB::sysUpTimeInstance
					that.uptime = vb.value;
				else if (vb.oid == '1,3,6,1,2,1,2,2,1,10,1') // IF-MIB::ifInOctets.1
					that.addRxValue(vb.value);
				else                                         // IF-MIB::ifOutOctets.1
					that.addTxValue(vb.value);
			});
		});
	};

	Router.getDefaultIpAddress = function()
	{
		return require('netroute').getGateway();
	};

	return Router;

})();

Array.prototype.last = function(){
	return this[this.length - 1];
};


var app = new Netmon();
