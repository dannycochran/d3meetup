var svgGrapher = function () {
  var grapher = {
    colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4'],
    initialize: function () {
      this.brush = d3.svg.brush().on('brushend', this.onBrushEnd.bind(this));
      this.zoom = d3.behavior.zoom();

      this.$el = $('div.network-container');
      this.$header = $('header');
      this.$svg = d3.select(this.$el.get(0)).append('svg').attr({width: '100%', height: '100%'});
      this.$network = this.$svg.append('g');

      this.$brush = this.$network.append('g').attr('class', 'brush');
      this.$brush.append('rect');

      this.$brush.call(this.brush);
      this.$svg.call(this.zoom);

      this.$header.find('button:not(#colorings)').on('click', this.toggleNetwork.bind(this));
      this.$header.find('button#colorings').on('click', this.updateColorings.bind(this));
      $(window).on('keydown', this.setBrushEnabled.bind(this));
      $(window).on('keyup', this.setBrushEnabled.bind(this));
    },

    render: function (data) {
      this.width = this.$el.width();
      this.height = this.$el.height();

      var headerTitle = 'Network in SVG (' + data.nodes.length + ' nodes & ' + data.links.length + ' links)';
      this.$header.find('span').html(headerTitle);

      // transform x & y coordinates to viewport
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

      // set up d3 zoom
      this.zoom // scale range factor of 10
        .scaleExtent([this.transform.scale / scaleRange, this.transform.scale * scaleRange])
        .translate(this.transform.translate)
        .scale(this.transform.scale)
        .on('zoom', this.onZoom.bind(this));

      // clear existing network
      this.$network.selectAll('line, circle').remove();

      this.brush.x(d3.scale.identity().domain(positionDomain[0]))
          .y(d3.scale.identity().domain(positionDomain[1]))
          .clamp([false, false]); // Let the user select outside the domain of the graph
      this.$brush.select('rect').attr({
          width: maxDimension * scaleRange * 2,
          height: maxDimension * scaleRange * 2,
          x: -maxDimension * scaleRange,
          y: -maxDimension * scaleRange,
        }).style({'visibility': 'hidden', 'cursor': 'crosshair'});

      // append links and nodes
      this.$links = this.$network.selectAll('.link').data(data.links).enter().append('line').attr({
        x1: function (d) { return data.nodes[d.from].x; },
        x2: function (d) { return data.nodes[d.to].x; },
        y1: function (d) { return data.nodes[d.from].y; },
        y2: function (d) { return data.nodes[d.to].y; }
      });
      this.$nodes = this.$network.selectAll('.node').data(data.nodes).enter().append('circle').attr({
        r: function (d) { return 1 + d.row_ids.length; },
        cx: function (d) { return d.x; },
        cy: function (d) { return d.y; }
      });

      // transform the network
      this.data = data;
      this.updateTransform();
      this.updateColorings();
      return this;
    },

    onZoom: function () {
      // If we're zooming with the mouse wheel or dragging with the alt key pressed, update the transform
      if (this.transform.scale !== d3.event.scale || d3.event.sourceEvent.altKey || d3.event.sourceEvent.ctrlKey) {
        this.transform = {translate: d3.event.translate, scale: d3.event.scale};
        this.updateTransform();
      } else this.zoom.translate(this.transform.translate);
    },

    onBrushEnd: function () { // Select the brushed nodes then remove the brush
      var r = this.brush.extent(),
          selectedNodes = {};
      this.$nodes.each(function (d) {
        if(r[0][0] <= d.x && d.x < r[1][0] && r[0][1] <= d.y && d.y < r[1][1]) selectedNodes[d.id] = true;
      });
      this.selectedNodes = selectedNodes;
      this.$brush.call(this.brush.clear());

      this.updateSelectedNodes();
    },

    updateSelectedNodes: function () { // Update the SVG transform attribute with the current view transform
      var selectedNodes = this.selectedNodes, nodes = this.data.nodes;
      this.$nodes.classed('active', function (d) { return d.id in selectedNodes; });
      this.$links.classed('active', function (d) {
        return nodes[d.from].id in selectedNodes && nodes[d.to].id in selectedNodes;
      });
    },

    setBrushEnabled: function (e) {
      if (e.type === 'keydown' && (e.altKey || e.ctrlKey)) this.$svg.classed('brush-disabled', true);
      else if (e.type === 'keyup') this.$svg.classed('brush-disabled', false);
    },

    updateColorings: function () { // random colors
      if (!this.$links) return;
      var colors = this.colors;
      this.$links.each(function () { d3.select(this).style({stroke: colors[Math.floor(Math.random() * 8)]}); });
      this.$nodes.each(function () { d3.select(this).style({fill: colors[Math.floor(Math.random() * 8)]}); });
    },

    updateTransform: function () {
      this.$network.attr('transform', 'translate(' + this.transform.translate + ')scale(' + this.transform.scale + ')');
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
  var grapher = new svgGrapher();
  grapher.render(smallNetwork);
});