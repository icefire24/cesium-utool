import * as Cesium from "cesium";
let earthRadiusMeters = 6378137.0;
let metersPerDegree = 2.0 * Math.PI * earthRadiusMeters / 360.0;
let radiansPerDegree = Math.PI / 180.0;
let degreesPerRadian = 180.0 / Math.PI;

/**
 * @description: 计算两点之间的方位角
 * @param {}
*/
function drawPloyineByPoints(viewer, positions) {
    let line = viewer.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(function () {
                return positions;
            }, false),
            material: Cesium.Color.YELLOW,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            width: 2
        },
    });
    return line;
}
/**
 * @description: 画面
*/
function drawPolygonByPoints(viewer, positions) {

    let polygon = viewer.entities.add({
        polygon: {
            hierarchy: positions,
            material: Cesium.Color.YELLOW,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            fill: true
        },
    });
    return polygon;
}
/*方向*/
function getBearing(from, to) {
    let lat1 = from[1] * radiansPerDegree;
    let lon1 = from[0] * radiansPerDegree;
    let lat2 = to[1] * radiansPerDegree;
    let lon2 = to[0] * radiansPerDegree;
    let angle = -Math.atan2(Math.sin(lon1 - lon2) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2));
    if (angle < 0) {
        angle += Math.PI * 2.0;
    }
    angle = angle * degreesPerRadian;
    return angle;
}
/**
 * @description: 计算两点之间的方位角
*/
function getAngle(p1, p2, p3) {
    let bearing21 = getBearing(p2, p1);
    let bearing23 = getBearing(p2, p3);
    let angle = bearing21 - bearing23;
    if (angle < 0) {
        angle += 360;
    }
    return angle;
}
/**
 * @description: 计算两点之间的距离 
*/
function addMeasureLabel(viewer, poi, measureResult) {
    console.log(poi);
    viewer.entities.add({
        // parent: tempEntities,
        position: poi,
        label: {
            text: measureResult,
            font: '14px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -40),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            horizontalOrigin: Cesium.HorizontalOrigin.TOP,
            fillColor: Cesium.Color.YELLOW
        }
    });
}
function getDistance(pointsArray) {
    let geodesic = new Cesium.EllipsoidGeodesic();
    if (pointsArray.length > 1) {
        let arrLength = pointsArray.length;
        let tmpDis = 0;
        let sumDis = 0;
        for (let i = 1; i < arrLength; i++) {
            geodesic.setEndPoints(pointsArray[i - 1], pointsArray[i]);
            tmpDis = Math.round(geodesic.surfaceDistance);
            sumDis = sumDis + tmpDis;
        }

        return sumDis;
    }
    else {
        return 0;
    }

}
//计算多边形面积
function getAreaMeasureNum(viewer, points) {
    if (points.length > 2) {
        let totalAngle = 0;
        for (let i = 0; i < points.length; i++) {
            let j = (i + 1) % points.length;
            let k = (i + 2) % points.length;
            totalAngle += getAngle(points[i], points[j], points[k]);
        }
        let planarTotalAngle = (points.length - 2) * 180.0;
        let sphericalExcess = totalAngle - planarTotalAngle;
        if (sphericalExcess > 420.0) {
            totalAngle = points.length * 360.0 - totalAngle;
            sphericalExcess = totalAngle - planarTotalAngle;
        } else if (sphericalExcess > 300.0 && sphericalExcess < 420.0) {
            sphericalExcess = Math.abs(360.0 - sphericalExcess);
        }
        let ss = sphericalExcess * radiansPerDegree * earthRadiusMeters * earthRadiusMeters;
        return sphericalExcess * radiansPerDegree * earthRadiusMeters * earthRadiusMeters;
    }
    else {
        return 0;
    }
}
export function measureDistance(viewer) {
    let scene = viewer.scene;
    let tooltip = document.querySelector(".toolTip");
    tooltip.style.display = "block";
    let measurePointArr = [];
    let positions = [];
    let poly = undefined;
    let disNum;
    let cartesian = undefined;
    let cartographic = undefined;
    let polyHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    polyHandler.setInputAction(function (movement) {
        let pickedObject = scene.pick(movement.position);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            //pickedObjects.push(pickedObject);
            cartesian = viewer.scene.pickPosition(movement.position);
        }
        else {
            let ray = viewer.camera.getPickRay(movement.position);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);

        }

        if (positions.length == 0) {
            positions.push(cartesian.clone());
        }
        positions.push(cartesian);
        tooltip.style.left = movement.position.x + 10 + "px";
        tooltip.style.top = movement.position.y + 20 + "px";
        cartographic = Cesium.Cartographic.fromCartesian(cartesian);

        measurePointArr.push(cartographic);
        disNum = getDistance(measurePointArr);

        let currentClickLon = Cesium.Math.toDegrees(cartographic.longitude);
        let currentClickLat = Cesium.Math.toDegrees(cartographic.latitude);
        let height = cartographic.height;

        if (disNum > 1000) {
            tooltip.innerHTML = (disNum / 1000).toFixed(2) + "千米";
        } else {
            tooltip.innerHTML = disNum.toFixed(2) + "米";
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    polyHandler.setInputAction(function (movement) {
        let pickedObject = scene.pick(movement.endPosition);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            cartesian = viewer.scene.pickPosition(movement.endPosition);
        }
        else {
            let ray = viewer.camera.getPickRay(movement.endPosition);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);

        }

        if (positions.length >= 2) {
            positions.pop();
            cartesian.y += (1 + Math.random());
            positions.push(cartesian);
            drawPloyineByPoints(viewer, positions);
        }
        tooltip.style.left = movement.endPosition.x + 10 + "px";
        tooltip.style.top = movement.endPosition.y + 20 + "px";
        if (cartesian) {
            cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            let currentClickLon = Cesium.Math.toDegrees(cartographic.longitude);
            let currentClickLat = Cesium.Math.toDegrees(cartographic.latitude);
            let height = cartographic.height;
            tooltip.innerHTML = currentClickLon.toFixed(2) + "," + currentClickLat.toFixed(2) + "," + height.toFixed(2) + ",单击绘制，双击结束";
        }

    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    polyHandler.setInputAction(function (movement) {
        positions.pop();
        positions.pop();
        disNum = disNum > 1000 ? (disNum / 1000).toFixed(2) + "千米" : disNum.toFixed(2) + "米";
        addMeasureLabel(viewer, positions[(positions.length - 1)], "长度：" + disNum);
        tooltip.style.display = "none";
        polyHandler.destroy();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}
export function measureArea(viewer) {
    let scene = viewer.scene;
    let tooltip = document.querySelector(".toolTip");
    tooltip.style.display = "block";
    let measurePointArr = [];
    let positions = [];
    let poly = undefined;
    let lastPoly = undefined;
    let areaNum;
    let cartesian = undefined;
    let cartographic = undefined;
    let polyHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    polyHandler.setInputAction(function (movement) {
        let pickedObject = scene.pick(movement.position);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            //pickedObjects.push(pickedObject);
            cartesian = viewer.scene.pickPosition(movement.position);
        }
        else {
            let ray = viewer.camera.getPickRay(movement.position);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        }

        if (positions.length == 0) {
            positions.push(cartesian.clone());
        }
        positions.push(cartesian);
        tooltip.style.left = movement.position.x + 10 + "px";
        tooltip.style.top = movement.position.y + 20 + "px";
        cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        let currentClickLon = Cesium.Math.toDegrees(cartographic.longitude);
        let currentClickLat = Cesium.Math.toDegrees(cartographic.latitude);

        measurePointArr.push([currentClickLon, currentClickLat]);
        areaNum = getAreaMeasureNum(viewer, measurePointArr);

        if (areaNum > 1e6) {
            tooltip.innerHTML = (areaNum / 1e6).toFixed(2) + "平方千米";
        } else {
            tooltip.innerHTML = areaNum.toFixed(2) + "平方米";
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    polyHandler.setInputAction(function (movement) {
        let pickedObject = scene.pick(movement.endPosition);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            //pickedObjects.push(pickedObject);
            cartesian = viewer.scene.pickPosition(movement.endPosition);
        }
        else {
            let ray = viewer.camera.getPickRay(movement.endPosition);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        }
        if (positions.length >= 2) {
            // if (!Cesium.defined(poly)) {
            //     poly = new polygonPrimitive(viewer,positions);
            // }else{
            if (lastPoly) {
                viewer.entities.remove(lastPoly);
            }
            positions.pop();
            cartesian.y += (1 + Math.random());
            positions.push(cartesian);
            lastPoly = drawPolygonByPoints(viewer, positions);
            // }
        }

        tooltip.style.left = movement.endPosition.x + 10 + "px";
        tooltip.style.top = movement.endPosition.y + 20 + "px";
        if (cartesian) {

            cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            let currentClickLon = Cesium.Math.toDegrees(cartographic.longitude);
            let currentClickLat = Cesium.Math.toDegrees(cartographic.latitude);
            let height = cartographic.height;
            tooltip.innerHTML = currentClickLon.toFixed(2) + "," + currentClickLat.toFixed(2) + "," + height.toFixed(2) + ",单击绘制，双击结束";
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    polyHandler.setInputAction(function (movement) {
        positions.pop();
        areaNum = areaNum > 1e6 ? (areaNum / 1e6).toFixed(2) + "平方千米" : areaNum.toFixed(2) + "平方米";
        addMeasureLabel(viewer, positions[(positions.length - 1)], "面积:" + areaNum);
        tooltip.style.display = "none";
        polyHandler.destroy();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}
//测高
export function measureHeight(viewer) {
    let tooltip = document.querySelector(".toolTip");
    let scene = viewer.scene;
    tooltip.style.display = "block";
    var measurePointArr = [];
    var positions = [];
    var poly = undefined;
    let cartesian = undefined;
    let cartographic = undefined;
    var polyHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    polyHandler.setInputAction(function (click) {
        var pickedObject = scene.pick(click.position);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            //pickedObjects.push(pickedObject);
            cartesian = viewer.scene.pickPosition(click.position);
        }
        else {
            var ray = viewer.camera.getPickRay(click.position);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        }

        if (positions.length == 0) {
            positions.push(cartesian.clone());
        }
        if (cartesian) {
            positions.push(cartesian);
            tooltip.style.left = click.position.x + 10 + "px";
            tooltip.style.top = click.position.y + 20 + "px";
            cartographic = Cesium.Cartographic.fromCartesian(cartesian);

            measurePointArr.push(cartographic.height);
        }

        if (measurePointArr.length == 2) {
            var heightNum = measurePointArr[1] - measurePointArr[0];

            addMeasureLabel(viewer, positions[(positions.length - 1)], "高度：" + heightNum + "米");
            tooltip.style.display = "none";

            polyHandler.destroy();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    polyHandler.setInputAction(function (movement) {
        var pickedObject = scene.pick(movement.endPosition);
        if (scene.pickPositionSupported && Cesium.defined(pickedObject)) {
            //pickedObjects.push(pickedObject);
            cartesian = viewer.scene.pickPosition(movement.endPosition);
        }
        else {
            var ray = viewer.camera.getPickRay(movement.endPosition);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        }
        if (positions.length >= 2) {
            positions.pop();
            cartesian.y += (1 + Math.random());
            positions.push(cartesian);
            drawPloyineByPoints(viewer, positions);
        }
        tooltip.style.left = movement.endPosition.x + 10 + "px";
        tooltip.style.top = movement.endPosition.y + 20 + "px";
        if (cartesian) {
            cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var currentClickLon = Cesium.Math.toDegrees(cartographic.longitude);
            var currentClickLat = Cesium.Math.toDegrees(cartographic.latitude);
            var height = cartographic.height;
            tooltip.innerHTML = currentClickLon.toFixed(2) + "," + currentClickLat.toFixed(2) + "," + height.toFixed(2) + ",单击两点测量高度";
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

}
export const clearEntities = (viewer) => {
    viewer.entities.removeAll();
}
export const loadTerrain = (viewer) => {
    var ellipsoidProvider = new Cesium.EllipsoidTerrainProvider();
    viewer.terrainProvider = ellipsoidProvider;
    // viewer.terrainProvider = terrainProvider;
    // viewer.scene.setTerrainExaggeration(2.0); // 地形夸张
    // viewer.scene.globe.depthTestAgainstTerrain = true; // 启用深度测试，让地形后面的东西消失。
    // viewer.scene.globe.enableLighting = true; // 对大气和雾启用动态照明效果
}