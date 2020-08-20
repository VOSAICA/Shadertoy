#iChannel0 "file://Test3.frag"


void main()
{
    vec3 color = texture(iChannel0, gl_FragCoord.xy / iResolution.xy).rgb;
    gl_FragColor = vec4(color, 1.0f);
}