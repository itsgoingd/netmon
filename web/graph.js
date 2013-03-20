var Graph = (function(){
	function Graph(options) {
		this.wrapper = document.getElementById(options.target);

		this.canvas = this.wrapper.getElementsByTagName('canvas')[0];
		this.canvas.height = this.wrapper.scrollHeight;
		this.canvas.width = this.wrapper.scrollWidth;

		this.ctx = this.canvas.getContext('2d');
		this.ctx.fillStyle = this.graph_color;

		this.font_size = Math.round(0.16 * this.canvas.height);
		if (this.font_size > 16)
			this.font_size = 16;

		this.ctx.strokeStyle = '#fff';
		this.ctx.lineWidth = '2';
		this.ctx.font = this.font_size + 'px Helvetica';
		this.ctx.textAlign = 'right';
		
		this.graph_color = options.graphColor || '#2D8BD2';
		this.text_color = options.legendColor || '#000';
		this.text_callback = options.legendCallback;

		if (!options.values)
			options.values = Graph.randomValues(options.showValues);

		this.legend_x = this.canvas.width - Math.round(this.canvas.width * 0.008);
		this.legend_min_y = this.canvas.height - Math.round(this.canvas.height * 0.055);
		this.legend_max_y = this.font_size;

		this.setData(options.values);
		this.draw();
	}
	
	Graph.prototype.draw = function(graph_color, text_color) {
		graph_color = graph_color || this.graph_color;
		text_color = text_color || this.text_color;
		
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		this.ctx.fillStyle = graph_color;
		this._drawArea(this.ctx, this.dataset);

		this.ctx.fillStyle = text_color;

		var text = Math.round(this.min * 10) / 10;
		if (this.text_callback instanceof Function)
			text = this.text_callback(text);

		this.ctx.fillText(text, this.legend_x, this.legend_min_y);

		var text = Math.round(this.max * 10) / 10;
		if (this.text_callback instanceof Function)
			text = this.text_callback(text);

		this.ctx.fillText(text, this.legend_x, this.legend_max_y);
	};
	
	Graph.prototype.setData = function(values) {
		var show_values = this.canvas.width / 8;

		if (show_values - 1 < values.length)
			values = values.slice(values.length - show_values - 1);
		else
			for (var i = 0; i < show_values - 1 - values.length; i++)
				values.unshift(0);

		this.max = values[0];
		this.min = values[0];
		for (var i = 1; i < values.length; i++) {
			if (values[i] < this.min)
				this.min = values[i];
			if (values[i] > this.max)
				this.max = values[i];
		}
		this.min = Math.floor(this.min);
		this.max = Math.ceil(this.max);

		var min_width = this.min;
		if (this.text_callback instanceof Function)
			min_width = this.text_callback(max_width);

		var max_width = this.max;
		if (this.text_callback instanceof Function)
			max_width = this.text_callback(max_width);

		min_width = min_width.toString().length*8;
		max_width = max_width.toString().length*8;

		this.minmax_width = (min_width > max_width) ? min_width : max_width;
		this.minmax_width += Math.round(this.canvas.width * 0.008);
		this.step = this.canvas.height/(this.max - this.min);

		this.dataset = [];
		for (var i = 0; i < values.length; i++) {
			var x = Math.round(i*(this.canvas.width-this.minmax_width)/values.length);
			var y = Math.round(this.canvas.height-((values[i]-this.min)*this.step));
			this.dataset.push({'x': x, 'y': y});
		}
	};

	Graph.prototype._drawLine = function(ctx, dataset) {
		ctx.beginPath();  
		ctx.moveTo(dataset[0].x, dataset[0].y);

		for (var i=1; i < dataset.length; i++) {
			ctx.lineTo(dataset[i].x, dataset[i].y);
		}
		
		ctx.stroke();
	};

	Graph.prototype._drawArea = function(ctx, dataset) {
		ctx.beginPath(); 
		ctx.moveTo(0, ctx.canvas.height);
		ctx.lineTo(dataset[0].x, dataset[0].y);

		for (var i=1; i < dataset.length; i++) {
			ctx.lineTo(dataset[i].x, dataset[i].y);
		}
		
		ctx.lineTo(dataset[dataset.length - 1].x, ctx.canvas.height);
		ctx.lineTo(0, ctx.canvas.height);
		
		ctx.fill();
	};

	Graph.prototype._drawSmoothLine = function(surf, ctrl_points){
		var l = ctrl_points.length;
		switch (l){
		case 0:
		case 1: //no control points
			break;
		case 2: //line
			surf.beginPath();
			surf.moveTo(ctrl_points[0].x, ctrl_points[0].y);
			surf.lineTo(ctrl_points[1].x, ctrl_points[1].y);
			surf.stroke();
			break;
		case 3: //lets use the second point as the two middle control points
			surf.beginPath();
			surf.moveTo(ctrl_points[0].x, ctrl_points[0].y);
			surf.bezierCurveTo(ctrl_points[1].x, ctrl_points[1].y, ctrl_points[1].x, ctrl_points[1].y, ctrl_points[2].x, ctrl_points[2].y);
			surf.stroke();
			break;
		default: //lets draw a bezier with the first 4 points, and for the rest lets create a control point to keep the line smooth
			surf.beginPath();
			surf.moveTo(ctrl_points[0].x, ctrl_points[0].y);
			var pnt_a = ctrl_points[1], pnt_b = ctrl_points[2], pnt_end = ctrl_points[3];
			surf.bezierCurveTo(pnt_a.x, pnt_a.y, pnt_b.x, pnt_b.y, pnt_end.x, pnt_end.y);
			ctrl_points = ctrl_points.slice(0);
			l = ctrl_points.length;
			pnt_b = ctrl_points[2];
			var i = 5;
			for (; i < l; i += 2){
				pnt_a = {x: pnt_end.x + (pnt_end.x - pnt_b.x), y: pnt_end.y + (pnt_end.y - pnt_b.y)};
				pnt_b = ctrl_points[i - 1];
				pnt_end = ctrl_points[i];
				surf.bezierCurveTo(pnt_a.x, pnt_a.y, pnt_b.x, pnt_b.y, pnt_end.x, pnt_end.y);
			}
			if (i == l){ //a last lonely point, lets use the calculated pnt_a as pnt_b
				pnt_a = {x: pnt_end.x + (pnt_end.x - pnt_b.x), y: pnt_end.y + (pnt_end.y - pnt_b.y)};
				pnt_b = pnt_a;
				pnt_end = ctrl_points[l - 1];
				surf.bezierCurveTo(pnt_a.x, pnt_a.y, pnt_b.x, pnt_b.y, pnt_end.x, pnt_end.y);
			}
			surf.stroke();
			break;
		}
	};
	
	Graph.randomValues = function(how_many) {
		var prev = 200;
		var values = [];
		for (var i=0; i < how_many; i++) {
			var rand = Math.round(Math.random()*100);
			var rand_sign = Math.random();
			if (rand_sign > 0.5) {
				var val = prev + rand;
			} else {
				var val = prev - rand;
			}
			if (val < 0)
				val = 0;
			prev = val;
			values.push(val);
		}
		return values;
	};
	
	return Graph;
})();