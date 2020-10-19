const int MAX_STEPS = 100;
const float MAX_DIST = 100.0f;
const float SURF_DIST = 0.01f;
const float eps = 0.001f;


float f(float x, float z)
{
    return cos(((x + iTime)*10.0 + cos(z*10.0)) * 0.5);
}


float GetDist(vec3 p)
{
    vec4 s = vec4(-1.0, 1, 6, 1.3);
    float sphereDist = length(p - s.xyz) - s.w;
    float planeDist = p.y;

    vec4 s1 = vec4(1.0, 0.5, 6, 0.9);
    float sphereDist2 = length(p - s1.xyz) - s1.w;

    float d = min(sphereDist, min(planeDist, sphereDist2));
    return d;
}a


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


bool castRay(vec3 ro, vec3 rd, out float resT)
{
    float dt = 0.01f;
    const float mint = 0.001f;
    const float maxt = 10.0f;
    float lh = 0.0f;
    float ly = 0.0f;
    for (float t = mint; t < maxt; t += dt)
    {
        vec3 p = ro + rd * t;
        float h = f(p.x, p.z);

        if (p.y < h)
        {
            resT = t - dt + dt*(lh-ly) / (p.y - ly - h + lh);
            return true;
        }

        dt = 0.01f*t;
        lh = h;
        ly = p.y;
    }
    return false;
}


bool castShadow(vec3 ro, vec3 rd, out float resT)
{
    float dt = 0.01f;
    const float mint = 0.001f;
    const float maxt = 10.0f;
    float lh = 0.0f;
    float ly = 0.0f;
    for (float t = mint; t < maxt; t += dt)
    {
        vec3 p = ro + rd * t;
        float h = f(p.x, p.z);

        if (p.y < h)
        {
            resT = t - dt + dt*(lh-ly) / (p.y - ly - h + lh);
            return true;
        }

        dt = 0.01f*t;
        lh = h;
        ly = p.y;
    }
    return false;
}


vec3 GetNormal(vec3 p)
{
#if 0
    float d = GetDist(p);
    vec2 e = vec2(0.01f, 0.0f);

    vec3 n = d - vec3
    (
        GetDist(p - e.xyy),
        GetDist(p - e.yxy),
        GetDist(p - e.yyx)
    );
    return normalize(n);
#else
    return normalize( vec3( f(p.x-eps,p.z) - f(p.x+eps,p.z),
                            2.0f*eps,
                            f(p.x,p.z-eps) - f(p.x,p.z+eps) ) );
#endif
}



vec3 GetLight(vec3 ro, vec3 rd, out float resT)
{
    vec3 p = ro + rd * resT;
    vec3 lightPos =  vec3(-100, 30, -60);
    lightPos.xz += vec2(sin(iTime),cos(iTime))*5.0;
    vec3 l = normalize(lightPos - p);
    vec3 n = GetNormal(p);

    float dif = clamp(dot(n, l), 0.0f, 1.0f);

    float T;
    if (castShadow(p, lightPos, T)) dif*= T;
    //float d = RayMarch(p + n * SURF_DIST * 2.0f, l);
    //if (d < length(lightPos - p))    dif*=0.1;
    return dif * vec3(1.0, 1.0, 1.0);
}


void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 color = vec3(0);

    vec3 ro = vec3(-0.3, 3.0, 2.0);
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.5, 1.0f));

    float t;

    if (castRay(ro, rd, t))  color = vec3(GetLight(ro, rd, t));
    else  color = vec3(0.0, 0.0, 0.0);

    gl_FragColor = vec4(color, 1.0);
}
