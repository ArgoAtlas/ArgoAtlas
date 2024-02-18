import * as d3 from "d3";

const width = 960;
const height = 600;

const svg = d3.create("svg").attr("width", width).attr("height", height);

const container = document.querySelector(".container");
container.append(svg.node());
