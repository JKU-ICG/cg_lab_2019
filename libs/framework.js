/**
 * Created by Samuel Gratzl on 08.02.2016.
 */
'use strict';

/**
 * load resources identified by a key: url store returning a promise when everything is loaded
 * @param resources the resources to load
 * @param callback optional callback as an alternative to the promise
 * @returns {Promise}
 */
function loadResources(resources, callback) {
  /**
   * tests whether the given url is a resource
   * @param url the url to test
   * @returns {boolean}
   */
  function isImageUrl(url) {
    return /.*\.(png|jpg|gif|bmp)$/.test(url);
  }
  /**
   * tests whether the given url is a model
   * @param url the url to test
   * @returns {boolean}
   */
  function isModelUrl(url) {
    return /.*\.(json)$/.test(url);
  }
  function isObjUrl(url) {
    return /.*\.(obj)$/.test(url);
  }
  return new Promise(function (resolve) {
    var result = {}, toLoad = Object.keys(resources);

    function allLoaded(key) {
      var i = toLoad.indexOf(key);
      if (i >= 0) {
        toLoad.splice(i, 1);
      }
      return toLoad.length === 0;
    }

    function loaded(key, value) {
      result[key] = value;
      if (allLoaded(key)) {
        if (callback) {
          callback(result);
        }
        resolve(result);
      }
    }

    function ajax(key, url, postProcess) {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.onload = function () {
        return loaded(key, postProcess(req.responseText));
      };
      req.send(null);
    }

    function load(key) {
      var value = resources[key];
      if (isImageUrl(value)) {
        var image_1 = new Image();
        image_1.src = value;
        image_1.onload = function () {
          return loaded(key, image_1);
        };
      }
      else if (isModelUrl(value)) {
        ajax(key, value, JSON.parse);
      } else if (isObjUrl(value)) {
        ajax(key, value, parseObjFile);
      } else {
        ajax(key, value, String);
      }
    }

    const keys = Object.keys(resources);
    if (keys.length === 0) {
      if (callback) {
        callback(result);
      }
      resolve(result);
      return;
    }

    keys.forEach(load);
  });
}

/**
 * displays the text given as a parameter on the screen
 * @param text the text we want to show
 */
function displayText(text) {
  document.getElementById('paragraph').innerText = text;
}

/**
 * clears the text on the screen
 */
function clearText() {
  displayText('');
}

/**
 * creates a WebGLRenderingContext along with a canvas to render to
 * @param width
 * @param height
 * @returns {WebGLRenderingContext}
 */
function createContext(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width || 400;
  canvas.height = height || 400;
  document.body.appendChild(canvas);
  createHtmlText(canvas);
  return canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false } );
}

/**
 * creates a html-paragraph for displaying text on screen
 * @param canvas the canvas the paragraph will be placed upon
 */
function createHtmlText(canvas) {
  var par = document.createElement('p');
  par.id = 'paragraph';
  par.style.width = canvas.clientWidth + 'px';
  var text = document.createTextNode('');
  par.appendChild(text);
  document.body.appendChild(par);
}

/**
 * creates a shader of the given type with the given code
 * @param gl GL context
 * @param code the shader code
 * @param type shader type
 * @returns {WebGLShader}
 */
function createShader(gl, code, type) {
  var gl_type = (typeof type === 'string') ? (type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER) : (type || gl.VERTEX_SHADER);
  var shader = gl.createShader(gl_type);
  // Load the shader source
  gl.shaderSource(shader, code);
  // Compile the shader
  gl.compileShader(shader);
  // Check the compile status
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    // Something went wrong during compilation; get the error
    var lastError = gl.getShaderInfoLog(shader);
    console.error('compile error: ' + shader + ': ' + lastError);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
/**
 * creates a program by the given vertex and fragment shader
 * @param gl GL context
 * @param vertex vertex shader or code
 * @param fragment fragment shader or code
 * @returns {WebGLProgram}
 */
function createProgram(gl, vertex, fragment) {
  var program = gl.createProgram();
  gl.attachShader(program, typeof vertex === 'string' ? createShader(gl, vertex, gl.VERTEX_SHADER) : vertex);
  gl.attachShader(program, typeof fragment === 'string' ? createShader(gl, fragment, gl.FRAGMENT_SHADER) : fragment);
  gl.linkProgram(program);
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    // something went wrong with the link
    var lastError = gl.getProgramInfoLog(program);
    console.error('Error in program linking:' + lastError);
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
/**
 * checks and updates the canvas size according to its current real size
 * @param gl
 */
function checkForWindowResize(gl) {
  var width = gl.canvas.clientWidth;
  var height = gl.canvas.clientHeight;
  if (gl.canvas.width != width ||
    gl.canvas.height != height) {
    gl.canvas.width = width;
    gl.canvas.height = height;
  }
}
/**
 * checks whether the given attribute location is valid
 * @param loc
 * @returns {boolean}
 */
function isValidAttributeLocation(loc) {
  return typeof loc === 'number' && loc >= 0;
}
/**
 * checks whether the given uniform location is valid
 * @param loc
 * @returns {boolean}
 */
function isValidUniformLocation(loc) {
  return typeof loc !== 'undefined' && loc instanceof WebGLUniformLocation;
}


/**
 * converts the given hex color, e.g., #FF00FF to an rgba tuple
 */
function hex2rgba(color) {
  color = parseInt(color.slice(1), 16);
  var r = (color & 0xff0000) >> 16;
  var g = (color & 0xff00) >> 8;
  var b = (color & 0xff);
  return {
    r: r / 255.,
    g: g / 255.,
    b: b / 255.,
    a: 1
  }
}

var glm = (function () {
  var identity = mat4.create();

  function deg2rad(degrees) {
    return degrees * Math.PI / 180;
  }

  return {
    deg2rad: deg2rad,
    translate: function (x, y, z) {
      return mat4.translate(mat4.create(), identity, [x, y, z || 0]);
    },
    scale: function (x, y, z) {
      return mat4.scale(mat4.create(), identity, [x, y, z]);
    },
    rotateX: function (degree) {
      return mat4.rotateX(mat4.create(), identity, deg2rad(degree));
    },
    rotateY: function (degree) {
      return mat4.rotateY(mat4.create(), identity, deg2rad(degree));
    },
    rotateZ: function (degree) {
      return mat4.rotateZ(mat4.create(), identity, deg2rad(degree));
    },
    transform: function (transform) {
      let r = mat4.create();
      if (transform.translate) {
        r = mat4.translate(r, r, transform.translate);
      }
      if (transform.rotateX) {
        r = mat4.rotateX(r, r, deg2rad(transform.rotateX));
      }
      if (transform.rotateY) {
        r = mat4.rotateY(r, r, deg2rad(transform.rotateY));
      }
      if (transform.rotateZ) {
        r = mat4.rotateZ(r, r, deg2rad(transform.rotateZ));
      }
      if (transform.scale) {
        r = mat4.scale(r, r, typeof transform.scale === 'number' ?  [transform.scale, transform.scale, transform.scale]: transform.scale);
      }
      return r;
    }
  };
})();

/**
 * returns the model of a sphere with the given radius
 * @param radius
 * @param latitudeBands
 * @param longitudeBands
 * @returns {ISGModel}
 */
function makeSphere(radius, latitudeBands, longitudeBands) {
  radius = radius || 2;
  latitudeBands = latitudeBands || 30;
  longitudeBands = longitudeBands || 30;

  //based on view-source:http://learningwebgl.com/lessons/lesson11/index.html
  var vertexPositionData = [];
  var normalData = [];
  var textureCoordData = [];
  for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
    var theta = latNumber * Math.PI / latitudeBands;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);
    for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
      var phi = longNumber * 2 * Math.PI / longitudeBands;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);
      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;
      var u = 1 - (longNumber / longitudeBands);
      var v = 1 - (latNumber / latitudeBands);
      normalData.push(x);
      normalData.push(y);
      normalData.push(z);
      textureCoordData.push(u);
      textureCoordData.push(v);
      vertexPositionData.push(radius * x);
      vertexPositionData.push(radius * y);
      vertexPositionData.push(radius * z);
    }
  }
  var indexData = [];
  for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
    for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
      var first = (latNumber * (longitudeBands + 1)) + longNumber;
      var second = first + longitudeBands + 1;
      indexData.push(first);
      indexData.push(second);
      indexData.push(first + 1);
      indexData.push(second);
      indexData.push(second + 1);
      indexData.push(first + 1);
    }
  }
  return {
    position: vertexPositionData,
    normal: normalData,
    texture: textureCoordData,
    index: indexData //1
  };
}

function parseObjFile(objectData) {
  //based on https://github.com/frenchtoast747/webgl-obj-loader/blob/master/webgl-obj-loader.js
  /*
   The OBJ file format does a sort of compression when saving a model in a
   program like Blender. There are at least 3 sections (4 including textures)
   within the file. Each line in a section begins with the same string:
     * 'v': indicates vertex section
     * 'vn': indicates vertex normal section
     * 'f': indicates the faces section
     * 'vt': indicates vertex texture section (if textures were used on the model)
   Each of the above sections (except for the faces section) is a list/set of
   unique vertices.
   Each line of the faces section contains a list of
   (vertex, [texture], normal) groups
   Some examples:
       // the texture index is optional, both formats are possible for models
       // without a texture applied
       f 1/25 18/46 12/31
       f 1//25 18//46 12//31
       // A 3 vertex face with texture indices
       f 16/92/11 14/101/22 1/69/1
       // A 4 vertex face
       f 16/92/11 40/109/40 38/114/38 14/101/22
   The first two lines are examples of a 3 vertex face without a texture applied.
   The second is an example of a 3 vertex face with a texture applied.
   The third is an example of a 4 vertex face. Note: a face can contain N
   number of vertices.
   Each number that appears in one of the groups is a 1-based index
   corresponding to an item from the other sections (meaning that indexing
   starts at one and *not* zero).
   For example:
       `f 16/92/11` is saying to
         - take the 16th element from the [v] vertex array
         - take the 92nd element from the [vt] texture array
         - take the 11th element from the [vn] normal array
       and together they make a unique vertex.
   Using all 3+ unique Vertices from the face line will produce a polygon.
   Now, you could just go through the OBJ file and create a new vertex for
   each face line and WebGL will draw what appears to be the same model.
   However, vertices will be overlapped and duplicated all over the place.
   Consider a cube in 3D space centered about the origin and each side is
   2 units long. The front face (with the positive Z-axis pointing towards
   you) would have a Top Right vertex (looking orthogonal to its normal)
   mapped at (1,1,1) The right face would have a Top Left vertex (looking
   orthogonal to its normal) at (1,1,1) and the top face would have a Bottom
   Right vertex (looking orthogonal to its normal) at (1,1,1). Each face
   has a vertex at the same coordinates, however, three distinct vertices
   will be drawn at the same spot.
   To solve the issue of duplicate Vertices (the `(vertex, [texture], normal)`
   groups), while iterating through the face lines, when a group is encountered
   the whole group string ('16/92/11') is checked to see if it exists in the
   packed.hashindices object, and if it doesn't, the indices it specifies
   are used to look up each attribute in the corresponding attribute arrays
   already created. The values are then copied to the corresponding unpacked
   array (flattened to play nice with WebGL's ELEMENT_ARRAY_BUFFER indexing),
   the group string is added to the hashindices set and the current unpacked
   index is used as this hashindices value so that the group of elements can
   be reused. The unpacked index is incremented. If the group string already
   exists in the hashindices object, its corresponding value is the index of
   that group and is appended to the unpacked indices array.
   */
  var verts = [], vertNormals = [], textures = [], unpacked = {};
  // unpacking stuff
  unpacked.verts = [];
  unpacked.norms = [];
  unpacked.textures = [];
  unpacked.hashindices = {};
  unpacked.indices = [];
  unpacked.index = 0;
  // array of lines separated by the newline
  var lines = objectData.split('\n');

  var VERTEX_RE = /^v\s/;
  var NORMAL_RE = /^vn\s/;
  var TEXTURE_RE = /^vt\s/;
  var FACE_RE = /^f\s/;
  var WHITESPACE_RE = /\s+/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var elements = line.split(WHITESPACE_RE);
    elements.shift();

    if (VERTEX_RE.test(line)) {
      // if this is a vertex
      verts.push.apply(verts, elements);
    } else if (NORMAL_RE.test(line)) {
      // if this is a vertex normal
      vertNormals.push.apply(vertNormals, elements);
    } else if (TEXTURE_RE.test(line)) {
      // if this is a texture
      textures.push.apply(textures, elements);
    } else if (FACE_RE.test(line)) {
      // if this is a face
      /*
      split this face into an array of vertex groups
      for example:
         f 16/92/11 14/101/22 1/69/1
      becomes:
        ['16/92/11', '14/101/22', '1/69/1'];
      */
      var quad = false;
      for (var j = 0, eleLen = elements.length; j < eleLen; j++){
          // Triangulating quads
          // quad: 'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2 v3/t3/vn3/'
          // corresponding triangles:
          //      'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2'
          //      'f v2/t2/vn2 v3/t3/vn3 v0/t0/vn0'
          if(j === 3 && !quad) {
              // add v2/t2/vn2 in again before continuing to 3
              j = 2;
              quad = true;
          }
          if(elements[j] in unpacked.hashindices){
              unpacked.indices.push(unpacked.hashindices[elements[j]]);
          }
          else{
              /*
              Each element of the face line array is a vertex which has its
              attributes delimited by a forward slash. This will separate
              each attribute into another array:
                  '19/92/11'
              becomes:
                  vertex = ['19', '92', '11'];
              where
                  vertex[0] is the vertex index
                  vertex[1] is the texture index
                  vertex[2] is the normal index
               Think of faces having Vertices which are comprised of the
               attributes location (v), texture (vt), and normal (vn).
               */
              var vertex = elements[ j ].split( '/' );
              /*
               The verts, textures, and vertNormals arrays each contain a
               flattend array of coordinates.
               Because it gets confusing by referring to vertex and then
               vertex (both are different in my descriptions) I will explain
               what's going on using the vertexNormals array:
               vertex[2] will contain the one-based index of the vertexNormals
               section (vn). One is subtracted from this index number to play
               nice with javascript's zero-based array indexing.
               Because vertexNormal is a flattened array of x, y, z values,
               simple pointer arithmetic is used to skip to the start of the
               vertexNormal, then the offset is added to get the correct
               component: +0 is x, +1 is y, +2 is z.
               This same process is repeated for verts and textures.
               */
              // vertex position
              unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
              unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
              unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
              // vertex textures
              if (textures.length) {
                unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 0]);
                unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 1]);
              }
              // vertex normals
              unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 0]);
              unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 1]);
              unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 2]);
              // add the newly created vertex to the list of indices
              unpacked.hashindices[elements[j]] = unpacked.index;
              unpacked.indices.push(unpacked.index);
              // increment the counter
              unpacked.index += 1;
          }
          if(j === 3 && quad) {
              // add v0/t0/vn0 onto the second triangle
              unpacked.indices.push( unpacked.hashindices[elements[0]]);
          }
      }
    }
  }
  return {
    position: unpacked.verts,
    normal: unpacked.norms.length === 0 ? null : unpacked.norms,
    texture: unpacked.textures.length === 0 ? null : unpacked.textures,
    index: unpacked.indices.length === 0 ? null : unpacked.indices
  };
}

function parseMtlFile(fileContent) {
  const NEW_MTL_RE = /^newmtl\s/;
  var NS_RE = /^Ns\s/;
  var KA_RE = /^Ka\s/;
  var KD_RE = /^Kd\s/;
  var KS_RE = /^Ks\s/;
  var KE_RE = /^Ke\s/;
  var MAP_KD_RE = /^map_Kd\s/;
  var WHITESPACE_RE = /\s+/;

  const materials = { };
  var material = null;

  fileContent.split('\n').forEach(function(line) {
    line = line.trim();
    const elems = line.split(WHITESPACE_RE);
    elems.shift(); //skip marker
    if (NEW_MTL_RE.test(line)) {
      material = {
        ambient: [0.2, 0.2, 0.2, 1.0],
        diffuse: [0.8, 0.8, 0.8, 1.0],
        specular: [0, 0, 0, 1],
        emission: [0, 0, 0, 1],
        shininess: 0.0,
        texture: null
      };
      materials[elems[0]] = material;
    } else if (NS_RE.test(line)) {
      material.shininess = parseFloat(elems[0]);
    } else if (KA_RE.test(line)) {
      material.ambient = [ parseFloat(elems[0]), parseFloat(elems[1]), parseFloat(elems[2]), 1];
    } else if (KD_RE.test(line)) {
      material.diffuse = [ parseFloat(elems[0]), parseFloat(elems[1]), parseFloat(elems[2]), 1];
    } else if (KS_RE.test(line)) {
      material.specular = [ parseFloat(elems[0]), parseFloat(elems[1]), parseFloat(elems[2]), 1];
    } else if (KE_RE.test(line)) {
      material.emission = [ parseFloat(elems[0]), parseFloat(elems[1]), parseFloat(elems[2]), 1];
    } else if (MAP_KD_RE.test(line)) {
      material.texture = elems[0];
    }
  });
  return materials;
}

/**
 * returns the model of a new rect of the given width and height
 * @param width
 * @param height
 * @returns {ISGModel}
 */
function makeRect(width, height) {
  width = width || 1;
  height = height || 1;
  var position = [-width, -height, 0, width, -height, 0, width, height, 0, -width, height, 0];
  var normal = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  var texture = [0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1];
  var index = [0, 1, 2, 2, 3, 0];
  return {
    position: position,
    normal: normal,
    texture: texture,
    index: index
  };
}

/**
 * base node of the scenegraph
 */
class SGNode {
  /**
   * new bas node of a scenegraph
   * @param children optional list of children or a single child to add
   */
  constructor(children) {
    //this.children = children || []; //only works when passing an array of children otherwise error in forEach
    this.children = typeof children !== 'undefined' ? [].concat(children) : []; //allows to add either a single child or multiple children
  }

  /**
   * appends a new child to this node
   * @param child the child to append
   * @returns {SGNode} the child
   */
  append(child) {
    this.children.push(child);
    return child;
  }

  /**
   * alias to append
   * @param child
   * @returns {SGNode}
   */
  push(child) {
    return this.append(child);
  }

  /**
   * removes a child from this node
   * @param child
   * @returns {boolean} whether the operation was successful
   */
  remove(child) {
    var i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
    }
    return i >= 0;
  };

  /**
   * render method to render this scengraph
   * @param context
   */
  render(context) {
    //render all children
    this.children.forEach(function (c) {
      return c.render(context);
    });
  };
}
/**
 * a transformation node, i.e applied a transformation matrix to its successors
 */
class TransformationSGNode extends SGNode {
  /**
   * the matrix to apply
   * @param matrix
   * @param children optional children
   */
  constructor(matrix, children) {
    super(children);
    this.matrix = matrix || mat4.create();
  }

  render(context) {
    //backup previous one
    var previous = context.sceneMatrix;
    //set current world matrix by multiplying it
    if (previous === null) {
      context.sceneMatrix = mat4.clone(this.matrix);
    }
    else {
      context.sceneMatrix = mat4.multiply(mat4.create(), previous, this.matrix);
    }
    //render children
    super.render(context);
    //restore backup
    context.sceneMatrix = previous;
  }

  // For consistency with labs:
  // using .matrix= instead of setMatrix also works!
  setMatrix(matrix) {
     this.matrix = matrix;
  }
}

/**
 * a shader node sets a specific shader for the successors
 */
class ShaderSGNode extends SGNode {
  /**
   * constructs a new shader node with the given program
   * @param program the shader program to use
   * @param children optional list of children
   */
  constructor(program, children) {
    super(children);
    this.program = program;
  }

  render(context) {
    //backup prevoius one
    var backup = context.shader;
    //set current shader
    context.shader = this.program;
    //activate the shader
    context.gl.useProgram(this.program);
    //render children
    super.render(context);
    //restore backup
    context.shader = backup;
    if (backup) {
      context.gl.useProgram(backup);
    }
  }
};

/**
 * a utility node for setting a uniform in a shader
 */
class SetUniformSGNode extends SGNode {
  constructor(uniform, value, children) {
    super(typeof uniform === 'string' ? children : uniform);
    this.uniforms = {};
    if (typeof uniform === 'string') {
      this.uniforms[uniform] = value;
    }
  }

  setUniforms(context) {
    const gl = context.gl,
      shader = context.shader;
    const that = this;
    Object.keys(this.uniforms).forEach(function(key) {
      const value = that.uniforms[key];
      const loc = gl.getUniformLocation(shader, key);
      if (typeof value === 'number') {
        gl.uniform1f(loc, value);
      } else if (typeof value === 'boolean') {
        gl.uniform1i(loc, value ? 1 : 0);
      } else if (Array.isArray(value)) {
        const l = value.length;
        const f = gl['uniform'+l+'f']
        f.apply(gl, [loc].concat(value));
      }
    });
  }

  render(context) {
    if (context.shader) {
      this.setUniforms(context);
    }
    //render children
    super.render(context);
  }

}

class AdvancedTextureSGNode extends SGNode {
  constructor(image, children ) {
      super(children);
      this.image = image;
      this.textureunit = 0;
      this.uniform = 'u_tex';
      this.textureId = -1;
  }

  init(gl) {
    this.textureId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textureId);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter || gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS || gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT || gl.REPEAT);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);

    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  render(context) {
    if (this.textureId < 0) {
      this.init(context.gl);
    }
    //set additional shader parameters
    gl.uniform1i(gl.getUniformLocation(context.shader, this.uniform), this.textureunit);

    //activate and bind texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, this.textureId);

    //render children
    super.render(context);

    //clean up
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

/**
 * a render node renders a specific model
 */
class RenderSGNode extends SGNode {
  constructor(renderer, children) {
    super(children);
    if (typeof renderer !== 'function') {
      //assume it is a model wrap it
      this.renderer = modelRenderer(renderer);
    }
    else {
      this.renderer = renderer;
    }
  }

  setTransformationUniforms(context) {
    //set matrix uniforms
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const normalMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    const projectionMatrix = context.projectionMatrix;

    const gl = context.gl,
      shader = context.shader;
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_modelView'), false, modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_normalMatrix'), false, normalMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_projection'), false, projectionMatrix);
  }

  render(context) {
    this.setTransformationUniforms(context);
    //call the renderer
    this.renderer(context);
    //render children
    super.render(context);
  }
}
/**
 * a factory method for creating a model renderer
 * @param model the model to render
 * @returns {function(ISGContext): void}
 */
function modelRenderer(model) {
  //number of vertices
  var numItems = model.index ? model.index.length : model.position.length / 3;
  var position = null;
  var texCoordBuffer = null;
  var normalBuffer = null;
  var indexBuffer = null;
  //first time init of buffers
  function init(gl) {
    position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.position), gl.STATIC_DRAW);
    if (model.texture) {
      texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texture), gl.STATIC_DRAW);
    }
    if (model.normal) {
      normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normal), gl.STATIC_DRAW);
    }
    if (model.index) {
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.index), gl.STATIC_DRAW);
    }
  }

  return function (context) {
    var gl = context.gl;
    var shader = context.shader;
    if (!shader) {
      return;
    }
    if (position === null) {
      //lazy init
      init(gl);
    }
    //set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    var positionLoc = gl.getAttribLocation(shader, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    var texCoordLoc = gl.getAttribLocation(shader, 'a_texCoord');
    if (isValidAttributeLocation(texCoordLoc)) {
      if(!model.texture) {
        gl.disableVertexAttribArray(texCoordLoc);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
      }
    }
    var normalLoc = gl.getAttribLocation(shader, 'a_normal');
    if (isValidAttributeLocation(normalLoc)) {
      if(!model.normal) {
        gl.disableVertexAttribArray(normalLoc);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
      }
    }
    //render elements
    if (model.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(gl.TRIANGLES, 0, numItems);
    }
  };
}

/**
 * a material node represents one material including (ambient, diffuse, specular, emission, and shininess)
 */
class MaterialSGNode extends SGNode {

  constructor(children) {
    super(children);
    this.ambient = [0.2, 0.2, 0.2, 1.0];
    this.diffuse = [0.8, 0.8, 0.8, 1.0];
    this.specular = [0, 0, 0, 1];
    this.emission = [0, 0, 0, 1];
    this.shininess = 0.0;
    this.uniform = 'u_material';
    //set of additional lights to set the uniforms
    this.lights = [];
  }

  setMaterialUniforms(context) {
    const gl = context.gl;
    //no materials in use
    if (!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, this.uniform+'.ambient'))) {
      return;
    }
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.ambient'), this.ambient);
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.diffuse'), this.diffuse);
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.specular'), this.specular);
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.emission'), this.emission);
    gl.uniform1f(gl.getUniformLocation(context.shader, this.uniform+'.shininess'), this.shininess);
  }

  render(context) {
    this.setMaterialUniforms(context);

    //just set the light with the precomputed world position
    this.lights.forEach(function(l) {
      l.setLight(context);
    })
    //render children
    super.render(context);
  }
}

/**
 * a light node represents a light including light position and light properties (ambient, diffuse, specular)
 * the light position will be transformed according to the current model view matrix
 */
class LightSGNode extends TransformationSGNode {

  constructor(position, children) {
    super(null, children);
    this.position = position || [0, 0, 0];
    this.ambient = [0, 0, 0, 1];
    this.diffuse = [1, 1, 1, 1];
    this.specular = [1, 1, 1, 1];
    //uniform name
    this.uniform = 'u_light';

    this._worldPosition = null;
  }

  setLightUniforms(context) {
    const gl = context.gl;
    //no materials in use
    if (!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, this.uniform+'.ambient'))) {
      return;
    }
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.ambient'), this.ambient);
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.diffuse'), this.diffuse);
    gl.uniform4fv(gl.getUniformLocation(context.shader, this.uniform+'.specular'), this.specular);
  }

  setLightPosition(context) {
    const gl = context.gl;
    if (!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, this.uniform+'Pos'))) {
      return;
    }
    const position = this._worldPosition || this.position;
    gl.uniform3f(gl.getUniformLocation(context.shader, this.uniform+'Pos'), position[0], position[1], position[2]);
  }

  computeLightPosition(context) {
    //transform with the current model view matrix
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const original = this.position;
    const position =  vec4.transformMat4(vec4.create(), vec4.fromValues(original[0], original[1],original[2], 1), modelViewMatrix);

    this._worldPosition = position;
  }

  /**
   * set the light uniforms without updating the last light position
   */
  setLight(context) {
    this.setLightPosition(context);
    this.setLightUniforms(context);
  }

  render(context) {
    this.computeLightPosition(context);
    this.setLight(context);

    //since this a transformation node update the matrix according to my position
    this.matrix = glm.translate(this.position[0], this.position[1], this.position[2]);
    //render children
    super.render(context);
  }
}

/**
 * returns a new rendering context
 * @param gl the gl context
 * @param projectionMatrix optional projection Matrix
 * @returns {ISGContext}
 */
function createSGContext(gl, projectionMatrix) {
  if (!projectionMatrix) {
    //create a default projection matrix
    projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
  }
  return {
    gl: gl,
    sceneMatrix: mat4.create(),
    viewMatrix: mat4.create(),
    projectionMatrix: projectionMatrix,
    shader: null
  };
}
/**
 * factory utils
 */
var sg = {
  root: function () {
    return new SGNode([].slice.call(arguments));
  },
  transform: function (matrix) {
    return new TransformationSGNode(matrix, [].slice.call(arguments).slice(1));
  },
  translate: function (x, y, z) {
    return sg.transform.apply(sg, [glm.translate(x, y, z || 0)].concat([].slice.call(arguments).slice(3)));
  },
  scale: function (x, y, z) {
    return sg.transform.apply(sg, [glm.scale(x, y, z)].concat([].slice.call(arguments).slice(3)));
  },
  rotateX: function (degree) {
    return sg.transform.apply(sg, [glm.rotateX(degree)].concat([].slice.call(arguments).slice(1)));
  },
  rotateY: function (degree) {
    return sg.transform.apply(sg, [glm.rotateY(degree)].concat([].slice.call(arguments).slice(1)));
  },
  rotateZ: function (degree) {
    return sg.transform.apply(sg, [glm.rotateZ(degree)].concat([].slice.call(arguments).slice(1)));
  },
  draw: function (renderer) {
    return new RenderSGNode(renderer, [].slice.call(arguments).slice(1));
  },
  drawSphere: function (radius, latitudeBands, longitudeBands) {
    return sg.draw.apply(sg, [makeSphere(radius || 2, latitudeBands || 30, longitudeBands || 30)].concat([].slice.call(arguments).slice(3)));
  },
  drawRect: function (width, height) {
    return sg.draw.apply(sg, [makeRect(width || 1, height || 1)].concat([].slice.call(arguments).slice(2)));
  },
  shader: function (program) {
    return new ShaderSGNode(program, [].slice.call(arguments).slice(1));
  },
  context: createSGContext
};
