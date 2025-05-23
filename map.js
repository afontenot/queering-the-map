'use strict';

const minZoom = 2;
const maxZoom = 19;
const maxMomentsPerLevel = 25;
const momentsUrl = "zoom.json";
const map = L.map("map").setView([0, 0], 2);
const seed = (Math.random()*2**32)>>>0;

let moments = null;
let visibleMoments = new Map();

function sfc32(a, b, c, d) {
    return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = c << 21 | c >>> 11;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

const getRandomMoment = function(rand, i, j, z) {
    const key = `${i},${j},${z}`;
    const value = moments[key];
    if (value.hasOwnProperty("moments")) {
        const choice = Math.floor(rand() * value["moments"].length);
        return value["moments"][choice];
    }
    const total = value["counts"].reduce((a, b) => a + b, 0);
    const r = rand() * total;
    let sum = 0;
    let choice = 0;
    for (; choice < 4; choice++) {
        sum += value["counts"][choice];
        if (sum > r) {
            break;
        }
    }
    return getRandomMoment(rand, 2 * i + choice % 2, 2 * j + (choice >> 1), z + 1);
}

const getMoments = function(maxMoments, i, j, z) {
    const key = `${i},${j},${z}`;
    // no moments in chosen region
    if (!moments.hasOwnProperty(key)) {
        return [];
    }
    // fewer than maxMomentsPerLevel in region, return it
    if (moments[key].hasOwnProperty("moments")) {
        return moments[key]["moments"];
    }
    // chose maxMoments moments from subregions at random
    const rand = sfc32(seed, i, j, z);
    const chosenMoments = [];
    for (let _k = 0; _k < maxMoments; _k++) {
        chosenMoments.push(getRandomMoment(rand, i, j, z));
    }
    return chosenMoments;
}

const refresh = function (newMoments) {
    for (const momentID of visibleMoments.keys()) {
        if (!newMoments.has(momentID)) {
            map.removeLayer(visibleMoments.get(momentID));
            visibleMoments.delete(momentID);
        }
    }
    for (const momentID of newMoments.keys()) {
        if (!visibleMoments.has(momentID)) {
            const moment = newMoments.get(momentID);
            const newMarker = L.marker([moment.latitude, moment.longitude]).addTo(map);
            newMarker._icon.classList.add("pinkmarker");
            newMarker.bindPopup(moment["description"].replaceAll("\n", "<br>"));
            visibleMoments.set(momentID, newMarker);
        }
    }
}

const reload = function () {
    if (!moments) {
        return;
    }
    const cz = map.getZoom();
    const bounds = map.getBounds();
    const minLon = Math.max(bounds.getWest(), -180);
    const minLat = Math.max(bounds.getSouth(), -90);
    const maxLon = Math.min(bounds.getEast(), 180);
    const maxLat = Math.min(bounds.getNorth(), 90);
    const newMoments = new Map();
    for (let z = minZoom; z <= cz; z++) {
        const minBoxLon = Math.floor((minLon + 180) / 360 * 2 ** z);
        const minBoxLat = Math.floor((minLat + 90) / 360 * 2 ** z);
        const maxBoxLon = Math.floor((maxLon + 180) / 360 * 2 ** z);
        const maxBoxLat = Math.floor((maxLat + 90) / 360 * 2 ** z);
        for (let i = minBoxLon; i <= maxBoxLon; i++) {
            for (let j = minBoxLat; j <= maxBoxLat; j++) {
                const chosenMoments = getMoments(maxMomentsPerLevel, i, j, z);
                // console.log(z, i, j, chosenMoments.length);
                for (const moment of chosenMoments) {
                    newMoments.set(moment["id"], moment);
                }
            }
        }
    }
    refresh(newMoments);
}

const loadJson = async function (url) {
    const response = await fetch(url);
    if (response.ok) {
        moments = await response.json();
        reload();
    }
}

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
    maxZoom: 19,
    minZoom: minZoom
}).addTo(map);

loadJson(momentsUrl);

map.on("zoomend", reload);
map.on("resize", reload);
map.on("moveend", reload);
