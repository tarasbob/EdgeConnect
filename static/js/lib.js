window.playerColors = ["black", "#c2270f", "#678bc0"];
window.emptyCellColors = ["#edcfa8", "#ab7f5b", "#cba781"];
window.strokeColor = "#704c29";

function redraw(){
    //CIRCLE DRAWING
    //remove all the cirlces
    window.groups.selectAll("circle").remove();

    //mark the transferred cells
    if(window.mode == "score"){
        window.groups.filter(function(d){return d.scoreState}).append("circle")
        .attr("r", window.cellSize/4)
        .attr("cx", function(d){ return getRealCoord(d.x, d.y, d.z).x; })
        .attr("cy", function(d){ return getRealCoord(d.x, d.y, d.z).y; })
        .attr("fill", function(d){
            return window.playerColors[d.scoreState];
        })
        .attr("fill-opacity", 1.0);
    }

    //bonus cells
    window.groups.filter(function(d){return d.bonus}).append("circle")
        .attr("r", window.cellSize/1.5)
        .attr("cx", function(d){ return getRealCoord(d.x, d.y, d.z).x; })
        .attr("cy", function(d){ return getRealCoord(d.x, d.y, d.z).y; })
        .attr("fill-opacity", 0.0)
        .attr("stroke", "black")
        .attr("stroke-width", window.cellSize/20);

    //marked cells
    window.groups.filter(function(d){return d.marked}).append("circle")
        .attr("r", window.cellSize/4)
        .attr("cx", function(d){ return getRealCoord(d.x, d.y, d.z).x; })
        .attr("cy", function(d){ return getRealCoord(d.x, d.y, d.z).y; })
        .attr("fill", "white")
        .attr("fill-opacity", 0.9);

    //edge cells
    window.groups.filter(function(d){return d.edge}).append("circle")
        .attr("r", window.cellSize/10)
        .attr("cx", function(d){ return getRealCoord(d.x, d.y, d.z).x; })
        .attr("cy", function(d){ return getRealCoord(d.x, d.y, d.z).y; });

    //STYLE THE HEXES
    window.hexes.attr("stroke", window.strokeColor)
        .attr("stroke-width", window.cellSize/50)
        .attr("fill", function(d){
            return properColor(d);
        });
}

function properColor(d){
    if(d.state == 0) return window.emptyCellColors[d.patternCol];
    return window.playerColors[d.state];
}

function getRealCoord(x, y, z){
    coord = new Object();
    var centerX = window.svgW/2;
    var centerY = window.svgH/2;
    coord.x = centerX+window.cellSize*Math.sqrt(3)*(x+z/2);
    coord.y = centerY+(3/2)*z*window.cellSize;
    return coord;
}


function getCell(){
    /* Returns the cell at specified coordinates. */
    if(arguments.length == 3)
        return window.dataset[window.cellMap['' + arguments[0] + ':' + arguments[1] + ':' + arguments[2]]];
    else
        return window.dataset[window.cellMap['' + arguments[0][0] + ':' + arguments[0][1] + ':' + arguments[0][2]]];
}

function cellExists(i, j, k){
    if(arguments.length == 3)
        return ('' + arguments[0] + ':' + arguments[1] + ':' + arguments[2]) in window.cellMap;
    else
        return ('' + arguments[0][0] + ':' + arguments[0][1] + ':' + arguments[0][2]) in window.cellMap;
}

var forEveryCell = function(func){
    /* Apply func to every cell */
    for(var i=-window.boardSize; i<=window.boardSize; i++){
        for(var j=-window.boardSize; j<=window.boardSize; j++){
            var k = -j-i;
            if(k <= window.boardSize && k >= -window.boardSize){
                func(getCell(i, j, k));
            }
        }
    }
}


Array.prototype.remove = function(element) {
    for (var i = 0; i < this.length; i++) {
        if (element.compare) { 
            if (this[i].compare(element)){
                this.splice(i, 1);
                break;
            }
        } else if (this[i] === element){ 
            this.splice(i, 1);
            break;
        }
    }
}

Array.prototype.vectorAdd = function(otherArr) {
    if(this.length != otherArr.length) return null;
    var out = [];
    for (var i = 0; i < this.length; i++) {
        out.push(this[i]+otherArr[i]);
    }
    return out;
}

Array.prototype.compare = function(testArr) {
    if (this.length != testArr.length) return false;
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { 
            if (!this[i].compare(testArr[i])) return false;
        } else if (this[i] !== testArr[i]){ 
            return false;
        }
    }
    return true;
}

Array.prototype.contains = function(element) {
    for (var i = 0; i < this.length; i++) {
        if (element.compare) { 
            if (this[i].compare(element)) return true;
        } else if (this[i] === element){ 
            return true;
        }
    }
    return false;
}

Array.prototype.extendUnique = function(otherArr) {
    for (var i = 0; i < otherArr.length; i++) {
        if (!this.contains(otherArr[i])) { 
            this.push(otherArr[i]);
        }
    }
}

function getNeighborsSimple(coord){
    /* Given the coordinates of a cell, return an array of neighbor coordinates
     * Does not take into account board size, or the center cell */
    var offsets = [[1, -1, 0], [-1, 1, 0], [1, 0, -1], [-1, 0, 1], [0, 1, -1], [0, -1, 1]];
    var neighbors = [];
    for(var i = 0; i < offsets.length; i++){
        var offset = offsets[i];
        neighbors.push(coord.vectorAdd(offset));
    }
    return neighbors;
}

function getNeighbors(cell){
    var neighbors = getNeighborsSimple([cell.x, cell.y, cell.z]);
    var neighborCells = [];
    for(var i = 0; i < neighbors.length; i++){
        var neighbor = neighbors[i];
        if(cellExists(neighbor))
            neighborCells.push(getCell(neighbor));
    }
    return neighborCells;
}

function floodFill(cell){
    /* Assign the neighbors of the given cell to the same group as the cell */
    var curScoreState = cell.scoreState;  //which color we are adding to the group
    var groupNum = cell.group;
    var stack = [];
    stack.push(cell);
    while(stack.length > 0){
        cell = stack.pop();
        var neighbors = getNeighbors(cell);
        for(var i = 0; i < neighbors.length; i++){
            var neighbor = neighbors[i];
            if(neighbor.group == -1 && neighbor.scoreState == curScoreState){
                neighbor.group = groupNum;
                stack.push(neighbor);
            }
        }
    }
}

function drawHexes(){
    //add group Elements
    window.svg.selectAll("g").remove();
    window.groups = window.svg.selectAll("g")
        .data(window.dataset)
        .enter()
        .append("g");

    //insert a polygon into every group
    window.hexes = window.groups.append("polygon")
        .attr("points", function(d){
            var points = "";
            for(var i=0; i<6; i++){
                coord = getRealCoord(d.x, d.y, d.z);
                points += coord.x + window.cellSize*Math.sin(i*Math.PI/3);
                points += ",";
                points += coord.y + window.cellSize*Math.cos(i*Math.PI/3);
                points += " ";
            }
            return points;
        });
}

function addSVG(){
    window.svgW = $("#board").width();
    window.svgH = Math.sqrt(3)*window.svgW/2;

    window.svg = d3.select("#board")
        .append("svg")
        .attr("width", window.svgW)
        .attr("height", window.svgH);
}

function calculateScore(max_player, min_player){
    forEveryCell(function(cell) {
        if(cell.state == min_player)
            cell.scoreState = min_player; 
        else
            cell.scoreState = max_player;
    });

    var done = false;
    var iters = 0;
    var numGroups = [0, 0, 0];
    while(!done && iters < 1000){
        done = true;
        iters += 1;
        forEveryCell(function(cell) {cell.group = -1;});
        numGroups = [0, 0, 0];
        //assign all cells to a group
        forEveryCell(function(cell) {
            if(cell.group == -1){
                cell.group = numGroups[cell.scoreState];
                floodFill(cell);
                numGroups[cell.scoreState] += 1;
            }
        });
        
        var numEdgeNodes = [[], [], []];
        for(var j = 1; j < 3; j++){
            for(var i = 0; i < numGroups[j]; i++){
                numEdgeNodes[j].push(0);
            }
        }
        
        //determine the number of edge cells in each group
        forEveryCell(function(cell) {
            if(cell.edge){
                numEdgeNodes[cell.scoreState][cell.group] += 1;
            }
        });
        
        //for every group that has less than 2 edge cells, switch the color
        forEveryCell(function(cell) {
            if(numEdgeNodes[cell.scoreState][cell.group] < 2){
                cell.scoreState = 3 - cell.scoreState;
                done = false;
            }
        });
    }

    assert(done);
    
    //calculate the final score
    numEdges = [0, 0, 0];
    numBonus = [0, 0, 0];
    forEveryCell(function(cell) {
        if(cell.edge)
            numEdges[cell.scoreState] += 1;
        if(cell.bonus)
            numBonus[cell.scoreState] += 1;
    });
    
    scores = new Object();
    scores["edge"] = numEdges;
    scores["groups"] = [0, 2*(numGroups[2] - numGroups[1]), 2*(numGroups[1] - numGroups[2])];
    if(numBonus[1] > numBonus[2])
        scores["special"] = [0, 1, 0];
    else
        scores["special"] = [0, 0, 1];
    scores["total"] = [0, 0, 0];
    scores["total"][1] = scores["edge"][1] + scores["groups"][1] + scores["special"][1];
    scores["total"][2] = scores["edge"][2] + scores["groups"][2] + scores["special"][2];
    
    assert(scores.total[1] + scores.total[2] == window.boardSize * 6 + 1);
    
    return scores;
}

function randomSample(population, k){
    var sample = [];
    var numLeft = population.length;
    for(var i = 0; i < population.length; i++){
        var e = population[i];
        if (Math.floor(Math.random() * (numLeft+1)) < k){
            sample.push(e);
            k -= 1;
        }
        numLeft -= 1;
    }
    return sample;
}

function assert(statement){
    if(!statement)
        console.log("Assert Error");
}
