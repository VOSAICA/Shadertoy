const int MAX_STEPS = 100;
const float MAX_DIST = 100.0f;
const float SURF_DIST = 0.01f;


vec4 MinDist(vec4 a, vec4 b)
{
    return a.x < b.x?a:b;
}


float planeDist(vec3 p)
{
    return p.y;
}


float sphereDist(vec3 p, vec3 s, float r)
{
    return length(p - s) - r;
}


vec4 GetDist(vec3 p)
{
    vec4 d = vec4(1e10, 0.0, 0.0, 0.0);
    d = MinDist(d, vec4(sphereDist(p, vec3(-1, 1.3, 6), 1.3), 1.0, 0.83, 0.4));
    d = MinDist(d, vec4(planeDist(p), 1.0, 1.0, 1.0));
    d = MinDist(d, vec4(sphereDist(p, vec3(1, 0.9, 6), 0.9), 0, 0, 1));

    //float d = min(sphereDist, min(planeDist, sphereDist2));
    return d;
}


float RayMarch(vec3 ro, vec3 rd)
{
    float d0 = 0.0f;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = ro + rd * d0;
        float ds = GetDist(p).x;
        d0+=ds;

        if (d0 > MAX_DIST || ds < SURF_DIST)    break;
    }
    return d0;
}


vec3 GetNormal(vec3 p, out vec3 c)
{
    vec4 al = GetDist(p);
    vec2 e = vec2(0.01f, 0.0f);

    float d = al.x;
    c = al.yzw;

    vec3 n = d - vec3
    (
        GetDist(p - e.xyy).x,
        GetDist(p - e.yxy).x,
        GetDist(p - e.yyx).x
    );
    return normalize(n);
}


vec3 GetLight(vec3 p)
{
    vec3 lightPos = vec3(0, 5, 3.5);
    lightPos.xz += vec2(sin(iTime),cos(iTime))*2.0;
    vec3 l = normalize(lightPos - p);
    vec3 c = vec3(0);
    vec3 n = GetNormal(p, c);

    float nDot = 0.5 * dot(n, l) + 0.5;
    vec3 dif = vec3(1.0, 1.0, 0.9) * c * clamp(nDot, 0.0, 1.0);

    if (p.y < 0.1)//floor color
    {
        dif -= float((int(p.x+100.0) % 2) ^ (int(p.z+100.0)) % 2) * 0.1;
    }

    float d = RayMarch(p + n * SURF_DIST * 2.0f, l);
    if (d < length(lightPos - p) && p.y < 2.0)    dif-=0.1;
    return dif;
}


void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 color = vec3(1.0);

    vec3 ro = vec3(0, 1, 0);
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0f));

    float d = RayMarch(ro, rd);

    vec3 p = ro + rd * d;
    vec3 dif = GetLight(p);

    color = dif;
    gl_FragColor = vec4(color, 1.0);
}
