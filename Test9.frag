float rand2D(float st)
{
    return (fract(sin(st) * 100000.0));
}


float rand2D(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898, 78.223))) * 43758.5453123);
}


float perlinNoise(float st)
{
    return rand2D(floor(st));
}


float noise(float st)
{
    return mix(rand2D(st), rand2D(st + 1.0), smoothstep(0.0, 1.0, fract(st)));
}


float noise2D(vec2 st)
{
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = rand2D(i);
    float b = rand2D(i + vec2(1.0, 0.0));
    float c = rand2D(i + vec2(0.0, 1.0));
    float d = rand2D(i + vec2(1.0, 1.0));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}


float fbm(vec2 st, float H)
{
#if 0
    float t = 0.0;
    for(int i = 0; i < 10; i++)
    {
        float f = pow(2.0, float(i));
        float a = pow(f, -3.0);
        t += a * noise2D(f * st);
    }
    return t;
#else
    float G = exp2(-H);
    float f = 1.0;
    float a = 1.0;
    float t = 0.0;
    for( int i=0; i<7; i++ )
    {
        t += a*noise2D(f*st);
        f *= 2.0;
        a *= G;
    }
    return t;
#endif
}


void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 color = vec3(0);

    color = vec3(fbm(uv.xy, 1.0));

    gl_FragColor = vec4(color, 1.0);
}
