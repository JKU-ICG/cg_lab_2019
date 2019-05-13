// Phong Vertex Shader

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_invView;

uniform vec3 u_lightPos;
uniform mat4 u_eyeToLightMatrix;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_lightVec;
varying vec3 v_eyeVec;
varying vec2 v_texCoord;
varying vec4 v_shadowMapTexCoord;

void main() {
	//compute vertex position in eye space
	vec4 eyePosition = u_modelView * vec4(a_position,1);

	//compute normal vector in eye space
  v_normalVec = u_normalMatrix * a_normal;

	//compute variables for light computation
  v_eyeVec = -eyePosition.xyz;
	v_lightVec = u_lightPos - eyePosition.xyz;

	//TASK 2.2: calculate vertex position in light clip space coordinates using u_eyeToLightMatrix (assign result to v_shadowMapTexCoord)
	v_shadowMapTexCoord = u_eyeToLightMatrix*eyePosition;
	//v_shadowMapTexCoord = vec4(0,0,0,0);

	//pass on texture coordinates
	v_texCoord = a_texCoord;

	gl_Position = u_projection * eyePosition;
}
