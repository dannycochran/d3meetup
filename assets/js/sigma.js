var sigmaGrapher = function () {
  var grapher = {
    colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#FFFFFF'],
    initialize: function () {
      this.brush = d3.svg.brush().on('brushend', this.onBrushEnd.bind(this));

      this.$el = $('div.network-container');
      this.$header = $('header');
      this.$svg = d3.select(this.$el.get(0)).append('svg').attr({width: '100%', height: '100%'});
      this.$brush = this.$svg.append('g').attr('class', 'brush');
      this.$brush.append('rect');

      this.$brush.call(this.brush);

      this.$el.on('mousedown mouseup mousemove', this.onMouseEvent.bind(this));
      this.$header.find('button:not(#colorings)').on('click', this.toggleNetwork.bind(this));
      this.$header.find('button#colorings').on('click', this.updateColorings.bind(this));

      $(window).on('keydown', this.setBrushEnabled.bind(this));
      $(window).on('keyup', this.setBrushEnabled.bind(this));
    },

    render: function (data) {
      this.data = data;
      this.$el.find('canvas').remove();
      this.$header.find('span').html('Network with Sigma.js (' + data.nodes.length + ' nodes & ' + data.links.length + ' links)');

      this.width = this.$el.width();
      this.height = this.$el.height();
      var positionDomain = [
            d3.extent(data.nodes, function (n) { return n.x; }),
            d3.extent(data.nodes, function (n) { return n.y; })
          ],
          scaleRange = 10,
          dataWidth = Math.max(positionDomain[0][1] - positionDomain[0][0], 1), // don't divide by 0
          dataHeight = Math.max(positionDomain[1][1] - positionDomain[1][0], 1),
          maxDimension = Math.max(dataWidth, dataHeight),
          scale = Math.min(this.width / dataWidth, this.height / dataHeight, 2) / 1.1, // 1.1 pads the network
          xTranslate = (this.width - dataWidth * scale) / 2 - positionDomain[0][0] * scale,
          yTranslate = (this.height - dataHeight * scale) / 2 - positionDomain[1][0] * scale;
      this.transform = {translate: [xTranslate, yTranslate], scale: scale};

      this.brush.x(d3.scale.identity().domain(positionDomain[0]))
          .y(d3.scale.identity().domain(positionDomain[1]))
          .clamp([false, false]); // Let the user select outside the domain of the graph
      this.$brush.select('rect').attr({
          width: maxDimension * scaleRange * 2,
          height: maxDimension * scaleRange * 2,
          x: -maxDimension * scaleRange,
          y: -maxDimension * scaleRange,
        }).style({'visibility': 'hidden', 'cursor': 'crosshair'});

      // modify data to have a radius
      _.each(data.nodes, function (n, i) {
        n.size = 1 + n.row_ids.length;
      });

      // create edges
      data.edges = data.links;
      _.each(data.edges, function (e, i) {
        e.id = i.toString(10);
        e.source = e.from.toString(10);
        e.target = e.to.toString(10);
        e.color = this.colors[Math.floor(Math.random() * 8)];
      }.bind(this));


      _.each(this.data.nodes, function (n) {
        n.color = this.colors[Math.floor(Math.random() * 8)];
      }.bind(this));

      sigma.renderers.def = sigma.renderers.webgl;
      // Instantiate sigma:
      this.s = new sigma({
        graph: data,
        container: this.$el.get(0),
        type: 'webgl',
        settings: {
          drawLabels: false,
          enableCamera: true,
          mouseWheelEnabled: true,
          mouseZoomDuration: 25
        }
      });

      this.$el.find('.sigma-labels').remove();
      return this;
    },

    onMouseEvent: function (e) {
      if (this.$el.css('cursor') === 'move') return;

      if (e.type === 'mousedown') this.$el.find('.sigma-mouse').hide();
      else if (e.type === 'mouseup') this.$el.find('.sigma-mouse').show();

      var evt = document.createEvent('MouseEvent');
      evt.initMouseEvent(e.type, e.canBubble,e.cancelable,e.view,e.detail,e.screenX,e.screenY,e.clientX,e.clientY,e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.button,e.relatedTarget);
      this.$brush.node().dispatchEvent(evt);
    },

    setBrushEnabled: function (e) {
      if (e.type === 'keydown' && (e.altKey || e.ctrlKey)) this.$el.addClass('brush-disabled');
      else if (e.type === 'keyup') this.$el.removeClass('brush-disabled');
    },

    onBrushEnd: function () { // Select the brushed nodes then remove the brush
      var r = this.brush.extent(),
          selectedNodes = {},
          transform = this.transform,
          transformX = function (x) { return x * transform.scale + transform.translate[0]; },
          transformY = function (y) { return y * transform.scale + transform.translate[1]; };

      _.each(this.data.nodes, function (d) {
        var x = transformX(d.x), y = transformY(d.y);
        if(r[0][0] <= x && x < r[1][0] && r[0][1] <= y && y < r[1][1]) selectedNodes[d.id] = true;
      });
      this.selectedNodes = selectedNodes;
      this.$brush.call(this.brush.clear());
      console.log('update selected nodes!');
      this.updateSelectedNodes();
    },

    updateSelectedNodes: function () {
      var selectedNodes = this.selectedNodes;

      this.s.graph.nodes().forEach(function (n) {
        if (n.id in selectedNodes) {
          n.prevColor = n.prevColor !== undefined ? n.prevColor : n.color;
          n.color = this.colors[8];
        } else n.color = n.prevColor !== undefined ? n.prevColor : n.color;
      }.bind(this));

      this.s.graph.edges().forEach(function (l) {
        if (l.from in selectedNodes && l.to in selectedNodes) {
          l.prevColor = l.prevColor !== undefined ? l.prevColor : l.color;
          l.color = this.colors[8];
        } else l.color = l.prevColor !== undefined ? l.prevColor : l.color;
      }.bind(this));

      this.s.refresh();
    },

    updateColorings: function () { // random colors
      _.each(this.s.graph.nodes(), function (n) {
        n.color = this.colors[Math.floor(Math.random() * 8)];
      }.bind(this));

      _.each(this.s.graph.edges(), function (l) {
        l.color = this.colors[Math.floor(Math.random() * 8)];
      }.bind(this));
      this.s.refresh();
    },

    toggleNetwork: function (e) {
      var networkData = $(e.currentTarget).attr('id') === 'small' ? smallNetwork : largeNetwork;
      this.render(networkData);
    },
  };
  grapher.initialize();
  return grapher;
};

$(document).ready(function () {
  grapher = new sigmaGrapher();
  grapher.render(smallNetwork);
});