/**
 * simple environment mapping shader
 * Created by Clemens Birklbauer on 08.04.2016.
 */

//attributes: per vertex inputs in this case the 2d position and its color
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;

//inverse view matrix to get from eye to world space
uniform mat3 u_invView;

//output variables requried in fragment shader
varying vec3 v_normalVec;
varying vec3 v_cameraRayVec;

void main() {
  //calculate vertex position in eye space (!vertex position in eye space = camera ray in eye space!)
  vec4 eyePosition = u_modelView * vec4(a_position,1);

  //TASK 3.1: transform camera ray direction to world space (assign result to v_cameraRayVec)
	v_cameraRayVec = u_invView * eyePosition.xyz;
  //v_cameraRayVec = vec3(0,0,0);

	//calculate normal vector in world space
	v_normalVec = u_invView * u_normalMatrix * a_normal;

  //gl_Position .. magic output variable storing the vertex 4D position
  gl_Position = u_projection * eyePosition;
}
