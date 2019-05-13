/**
 * Created by Samuel Gratzl on 29.02.2016.
 */
attribute vec3 a_position;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;

void main() {
	vec4 eyePosition = u_modelView * vec4(a_position,1);

	gl_Position = u_projection * eyePosition;
}
