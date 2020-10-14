const int MAX_STEPS = 100;
const float MAX_DIST = 100.0f;
const float SURF_DIST = 0.01f;


float GetDist(vec3 p)
{
    vec4 s = vec4(-1.0, 1, 6, 1.3);
    float sphereDist = length(p - s.xyz) - s.w;
    float planeDist = p.y;

    vec4 s1 = vec4(1.0, 0.5, 6, 0.9);
    float sphereDist2 = length(p - s1.xyz) - s1.w;

    float d = min(sphereDist, min(planeDist, sphereDist2));
    return d;
}


float RayMarch(vec3 ro, vec3 rd)
{
    float d0 = 0.0f;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = ro + rd * d0;
        float ds = GetDist(p);
        d0+=ds;

        if (d0 > MAX_DIST || ds < SURF_DIST)    break;
    }
    return d0;
}


vec3 GetNormal(vec3 p)
{
    float d = GetDist(p);
    vec2 e = vec2(0.01f, 0.0f);

    vec3 n = d - vec3
    (
        GetDist(p - e.xyy),
        GetDist(p - e.yxy),
        GetDist(p - e.yyx)
    );
    return normalize(n);
}


float GetLight(vec3 p)
{
    vec3 lightPos = vec3(0, 5, 6);
    lightPos.xz += vec2(sin(iTime),cos(iTime))*2.0;
    vec3 l = normalize(lightPos - p);
    vec3 n = GetNormal(p);

    float dif = clamp(dot(n, l), 0.0f, 1.0f);

    if (p.y < 0.1)//floor color
    {
        dif -= float((int(p.x+100.0) % 2) ^ (int(p.z+100.0)) % 2) * 0.1;
    }

    float d = RayMarch(p + n * SURF_DIST * 2.0f, l);
    if (d < length(lightPos - p))    dif*=0.1;
    return dif;
}


void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 color = vec3(0);

    vec3 ro = vec3(0, 1, 0);
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0f));

    float d = RayMarch(ro, rd);

    vec3 p = ro + rd * d;
    float dif = GetLight(p);

    color = vec3(dif);
    gl_FragColor = vec4(color, 1.0);
}
