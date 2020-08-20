#include "Test4Common.frag"
#iChannel0 "file://Test4.frag"


void main()
{
    vec3 color = texture(iChannel0, gl_FragCoord.xy / iResolution.xy).rgb;
    
    color *= c_exposure;
    color = ACESFilm(color);
    color = Linear2SRGB(color);

    gl_FragColor = vec4(color, 1.0f);
}
