var lightPosition = vec4(30.0, 30.0, 30.0, 0.0);
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var color = vec4(0.2, 0.5, 0.8, 1.0);
var materialAmbient = color;
var materialDiffuse = color;
var materialSpecular = color;
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var texture;
var texCoordsArray = [];
var texCoord = [];
var image;

var p = 2;
var r1 = 0.6;
var q1 = 5;
var r2 = 0.75;
var q2 = 10;
var s1 = 0.35;
var m1 = 5;

var wireframe = 1;
var phongShaded = 0;
var gouraudShaded = 0;
var textureMapping = 0;

const U_DIFFERENCE_WIREFRAME = 0.02;
const V_DIFFERENCE_WIREFRAME = 0.3;

const U_DIFFERENCE_SURFACE = 0.005;
const V_DIFFERENCE_SURFACE = 0.05;

var uDifference;
var vDifference;

var canvas;
var gl;
var program;

var pointCountOnCircle = 0;
var circleCount = 0;
var circlePointsIndex = 0;
var pointsBetweenCirclesIndex = 0;

var pointsArray = [];
var normalsArray = [];
var normalMatrix, normalMatrixLoc;

var near = -50;
var far = 50;
var radius = 30.0;
var theta = 0.0;
var phi = 0.0;

var zoom = 12;
var left = -zoom;
var right = zoom;
var ytop = zoom;
var bottom = -zoom;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  setUVDifference();
  drawDecoratedTorusKnot();

  if (wireframe == 0) {
    configureTextureCoordinates();
    addSurface();
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.enable(gl.DEPTH_TEST);

  if (wireframe == 1) {
    program = initShaders(
      gl,
      "vertex-shader-wireframe",
      "fragment-shader-wireframe"
    );
  } else if (phongShaded == 1) {
    program = initShaders(
      gl,
      "vertex-shader-phong-shaded",
      "fragment-shader-phong-shaded"
    );
  } else if (gouraudShaded == 1) {
    program = initShaders(
      gl,
      "vertex-shader-gouraud-shaded",
      "fragment-shader-gouraud-shaded"
    );
  } else if (textureMapping == 1) {
    program = initShaders(
      gl,
      "vertex-shader-texture",
      "fragment-shader-texture"
    );
  }

  gl.useProgram(program);

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  var nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  var vNormal = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormal);

  ambientProduct = mult(lightAmbient, materialAmbient);
  diffuseProduct = mult(lightDiffuse, materialDiffuse);
  specularProduct = mult(lightSpecular, materialSpecular);

  // Texture
  if (textureMapping == 1) {
    configureTexture(image);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
  }

  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );

  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

  document.getElementById("zoomIn").onclick = function () {
    if (zoom > 2) {
      setZoom(zoom - 2);
    }
    render();
  };
  document.getElementById("zoomOut").onclick = function () {
    setZoom(zoom + 2);
    render();
  };
  document.getElementById("thetaSlider").onchange = function () {
    theta = (event.srcElement.value * Math.PI) / 180.0;
  };
  document.getElementById("phiSlider").onchange = function () {
    phi = (event.srcElement.value * Math.PI) / 180.0;
  };
  document.getElementById("pSlider").onchange = function () {
    p = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("r1Slider").onchange = function () {
    r1 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("q1Slider").onchange = function () {
    q1 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("r2Slider").onchange = function () {
    r2 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("q2Slider").onchange = function () {
    q2 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("s1Slider").onchange = function () {
    s1 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("m1Slider").onchange = function () {
    m1 = event.srcElement.value;
    reset();
    init();
  };
  document.getElementById("wireframe").onclick = function () {
    wireframe = 1;
    phongShaded = 0;
    gouraudShaded = 0;
    textureMapping = 0;
    reset();
    init();
  };
  document.getElementById("phong").onclick = function () {
    wireframe = 0;
    phongShaded = 1;
    gouraudShaded = 0;
    textureMapping = 0;
    reset();
    init();
  };
  document.getElementById("gouraud").onclick = function () {
    wireframe = 0;
    phongShaded = 0;
    gouraudShaded = 1;
    textureMapping = 0;
    reset();
    init();
  };
  document.getElementById("textureMapping1").onclick = function () {
    image = document.getElementById("texture1");
    wireframe = 0;
    phongShaded = 0;
    gouraudShaded = 0;
    textureMapping = 1;
    reset();
    init();
  };
  document.getElementById("textureMapping2").onclick = function () {
    image = document.getElementById("texture2");
    wireframe = 0;
    phongShaded = 0;
    gouraudShaded = 0;
    textureMapping = 1;
    reset();
    init();
  };
  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  eye = vec3(
    radius * Math.sin(phi),
    radius * Math.sin(theta),
    radius * Math.cos(phi)
  );

  modelViewMatrix = lookAt(eye, at, up);
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);

  normalMatrix = [
    vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
    vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
    vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2]),
  ];

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

  // Texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

  if (wireframe == 1) {
    for (var i = 0; i < circlePointsIndex; i += pointCountOnCircle) {
      gl.drawArrays(gl.LINE_LOOP, i, pointCountOnCircle);
    }

    for (
      var i = circlePointsIndex;
      i < pointsBetweenCirclesIndex;
      i += circleCount
    ) {
      gl.drawArrays(gl.LINE_LOOP, i, circleCount);
    }
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
  }

  window.requestAnimFrame(render);
}

function cos(x) {
  return Math.cos(x);
}

function sin(x) {
  return Math.sin(x);
}

function getX(u, v) {
  return (
    4 * cos(p * u) * (1 + r1 * (cos(q1 * u) + r2 * cos(q2 * u))) +
    cos(v) * cos(p * u) * (1 + r1 * (cos(q1 * u) + r2 * cos(q2 * u)))
  );
}

function getY(u, v) {
  return (
    4 * sin(p * u) * (1 + r1 * (cos(q1 * u) + r2 * cos(q2 * u))) +
    cos(v) * sin(p * u) * (1 + r1 * (cos(q1 * u) + r2 * cos(q2 * u)))
  );
}

function getZ(u, v) {
  return sin(v) + s1 * sin(m1 * u);
}

function addSurface() {
  var newPointsArray = [];
  var tmpNormals = []; // To be used to find vertex normals.
  var a;
  var b;
  var c;
  var d;
  var t1;
  var t2;
  var normal;
  var rectangleIndex;

  for (var circleIndex = 0; circleIndex < circleCount; circleIndex++) {
    for (var pointIndex = 0; pointIndex < pointCountOnCircle; pointIndex++) {
      a = pointsArray[circleIndex * pointCountOnCircle + pointIndex];
      b =
        pointsArray[
          ((circleIndex + 1) % circleCount) * pointCountOnCircle + pointIndex
        ];
      c =
        pointsArray[
          ((circleIndex + 1) % circleCount) * pointCountOnCircle +
            ((pointIndex + 1) % pointCountOnCircle)
        ];
      d =
        pointsArray[
          circleIndex * pointCountOnCircle +
            ((pointIndex + 1) % pointCountOnCircle)
        ];

      function quad(a, b, c, d) {
        const indices = [a, b, c, a, c, d];
        t1 = subtract(b, a);
        t2 = subtract(c, b);
        normal = cross(t1, t2);
        normal = vec3(normal);

        tmpNormals.push(normal);

        for (var i = 0; i < indices.length; ++i) {
          newPointsArray.push(indices[i]);
          // normalsArray.push(indices[i][0], indices[i][1], indices[i][2], 0.0);
        }
      }

      quad(a, b, c, d);
    }
  }

  for (var index = 0; index < newPointsArray.length; index++) {
    rectangleIndex = parseInt(index / 6);

    if ((rectangleIndex + 1) % pointCountOnCircle == 0) {
      var lowerRectangleIndex = rectangleIndex - pointCountOnCircle + 1;
    } else {
      var lowerRectangleIndex = rectangleIndex + 1;
    }

    if (rectangleIndex % pointCountOnCircle == 0) {
      var upperRectangleIndex = rectangleIndex + pointCountOnCircle - 1;
    } else {
      var upperRectangleIndex = rectangleIndex - 1;
    }
    //************ */
    var leftRectangleIndex = rectangleIndex - pointCountOnCircle;

    if (leftRectangleIndex < 0) {
      leftRectangleIndex += tmpNormals.length;
    }

    var rightRectangleIndex =
      (rectangleIndex + pointCountOnCircle) % tmpNormals.length;

    var upperLeftRectangleIndex = upperRectangleIndex - pointCountOnCircle;

    if (upperLeftRectangleIndex < 0) {
      upperLeftRectangleIndex += tmpNormals.length;
    }

    var lowerLeftRectangleIndex = lowerRectangleIndex - pointCountOnCircle;

    if (lowerLeftRectangleIndex < 0) {
      lowerLeftRectangleIndex += tmpNormals.length;
    }

    var upperRightRectangleIndex =
      (upperRectangleIndex + pointCountOnCircle) % tmpNormals.length;

    var lowerRightRectangleIndex =
      (lowerRectangleIndex + pointCountOnCircle) % tmpNormals.length;

    if (index % 6 == 0 || index % 6 == 3) {
      function add(k, l) {
        return vec3(k[0] + l[0], k[1] + l[1], k[2] + l[2]);
      }

      // vertex a
      var tmp1 = add(
        tmpNormals[upperLeftRectangleIndex],
        tmpNormals[upperRectangleIndex]
      );

      var tmp2 = add(
        tmpNormals[leftRectangleIndex],
        tmpNormals[rectangleIndex]
      );

      var sumNormals = add(tmp1, tmp2);
      sumNormals = normalize(sumNormals);
      normalsArray.push(sumNormals[0], sumNormals[1], sumNormals[2], 0.0);
    } else if (index % 6 == 1) {
      // vertex b
      var tmp1 = add(
        tmpNormals[upperRightRectangleIndex],
        tmpNormals[upperRectangleIndex]
      );

      var tmp2 = add(
        tmpNormals[rightRectangleIndex],
        tmpNormals[rectangleIndex]
      );

      var sumNormals = add(tmp1, tmp2);
      sumNormals = normalize(sumNormals);
      normalsArray.push(sumNormals[0], sumNormals[1], sumNormals[2], 0.0);
    } else if (index % 6 == 2 || index % 6 == 4) {
      // vertex c
      var tmp1 = add(
        tmpNormals[lowerRightRectangleIndex],
        tmpNormals[lowerRectangleIndex]
      );

      var tmp2 = add(
        tmpNormals[rightRectangleIndex],
        tmpNormals[rectangleIndex]
      );

      var sumNormals = add(tmp1, tmp2);
      sumNormals = normalize(sumNormals);
      normalsArray.push(sumNormals[0], sumNormals[1], sumNormals[2], 0.0);
    } else {
      // vertex d
      var tmp1 = add(
        tmpNormals[lowerLeftRectangleIndex],
        tmpNormals[lowerRectangleIndex]
      );

      var tmp2 = add(
        tmpNormals[leftRectangleIndex],
        tmpNormals[rectangleIndex]
      );
      var sumNormals = add(tmp1, tmp2);
      sumNormals = normalize(sumNormals);
      normalsArray.push(sumNormals[0], sumNormals[1], sumNormals[2], 0.0);
    }
  }

  pointsArray = newPointsArray;
}

function drawDecoratedTorusKnot() {
  circlePointsIndex = 0;
  pointsBetweenCirclesIndex = 0;
  pointCountOnCircle = 0;
  circleCount = 0;

  function nextU(u) {
    return Math.round((u + uDifference) * 1000) / 1000;
  }

  function nextV(v) {
    return Math.round((v + vDifference) * 1000) / 1000;
  }

  for (var i = 0; i < 6.28; i = nextV(i)) {
    pointCountOnCircle++;
  }

  for (var i = 0; i < 6.28; i = nextU(i)) {
    circleCount++;
  }

  for (var u = 0; u < 6.28; u = nextU(u)) {
    for (var v = 0; v < 6.28; v = nextV(v)) {
      pointsArray.push(vec4(getX(u, v), getY(u, v), getZ(u, v), 1));
      circlePointsIndex++;
    }
  }

  pointsBetweenCirclesIndex = circlePointsIndex;

  for (var i = 0; i < pointCountOnCircle; i++) {
    for (var j = 0; j < circleCount; j++) {
      pointsArray.push(pointsArray[i + pointCountOnCircle * j]);
      pointsBetweenCirclesIndex++;
    }
  }
}

// Texture
function configureTexture(image) {
  function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }

  texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Now that the image has loaded make copy it to the texture.
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
    // Yes, it's a power of 2. Generate mips.
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function configureTextureCoordinates() {
  // Just for readability
  var verticalEdgeCount = pointCountOnCircle;
  var horizontalEdgeCount = circleCount;
  var a;
  var b;
  var c;
  var d;
  var textureIndices = [0, 1, 2, 0, 2, 3];

  const partCountX = 15;
  const partCountY = 1;
  const iDiff = partCountX / horizontalEdgeCount;
  const jDiff = partCountY / verticalEdgeCount;

  for (var p = 0; p < partCountX * partCountY; p++) {
    for (var i = 0.0; i <= 1.0; i = i + iDiff) {
      for (var j = 1.0; j >= 0.0; j = j - jDiff) {
        a = vec2(i, j - jDiff);
        b = vec2(i, j);
        c = vec2(i + iDiff, j);
        d = vec2(i + iDiff, j - jDiff);
        textureIndices = [a, b, c, a, c, d];

        for (var k = 0; k < 6; k++) {
          texCoordsArray.push(textureIndices[k]);
        }
      }
    }
  }
}

function setUVDifference() {
  if (wireframe == 1) {
    uDifference = U_DIFFERENCE_WIREFRAME;
    vDifference = V_DIFFERENCE_WIREFRAME;
  } else {
    uDifference = U_DIFFERENCE_SURFACE;
    vDifference = V_DIFFERENCE_SURFACE;
  }
}

function reset() {
  pointsArray = [];
  normalsArray = [];
  texCoordsArray = [];
  circlePointsIndex = 0;
  pointsBetweenCirclesIndex = 0;
}

function setZoom(newZoom) {
  zoom = newZoom;
  left = -zoom;
  right = zoom;
  ytop = zoom;
  bottom = -zoom;
}
