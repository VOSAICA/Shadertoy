#define HALF_LAMBERT
#define FLOOR_GRID

const int MAX_STEPS = 100;
const float MAX_DIST = 100.0f;
const float SURF_DIST = 0.01f;


mat3x3 rotateY(in float theta)
{
    return
    mat3x3
    (
        1, 0, 0,
        0, cos(theta), -sin(theta),
        0, sin(theta), cos(theta)
    );
}


mat3x3 rotateX(in float theta)
{
    return
    mat3x3
    (
        cos(theta), 0, sin(theta),
        0, 1, 0,
        -sin(theta), 0, cos(theta)
    );
}


vec4 minDist(vec4 a, vec4 b)
{
    return a.x < b.x ? a:b;
}


float sdPlane(vec3 p)
{
    return p.y + 1.0;
}


float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}


float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}


vec4 getDist(vec3 p)
{
    vec4 d = vec4(1e10, 0.0, 0.0, 0.0);
    mat3x3 rotateX = rotateX(iTime);
    mat3x3 rotateY = rotateY(iTime);

    d = minDist(d, vec4(sdSphere(p-vec3(-1, 0.5, 1.5), 0.5), 1.0, 0.83, 0.4));
    d = minDist(d, vec4(sdPlane(p), 1.0, 1.0, 1.0));
    d = minDist(d, vec4(sdBox(rotateX * rotateY * p - rotateX * rotateY * vec3(0.6, 0.5, 2), vec3(0.4, 0.4, 0.4)), 0.5, 0.5, 1));
    //d = minDist(d, vec4(sdBox(p - vec3(1, 0.5, 2), vec3(0.5, 0.5, 0.5)), 0.5, 0.5, 1));
    return d;
}


float rayMarch(vec3 ro, vec3 rd)
{
    float d0 = 0.0f;
    for (int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = ro + rd * d0;
        float ds = getDist(p).x;
        d0+=ds;

        if (d0 > MAX_DIST || ds < SURF_DIST)  break;
    }
    return d0;
}


vec3 GetNormal(vec3 p, out vec3 c)
{
    vec4 al = getDist(p);
    vec2 e = vec2(0.01f, 0.0f);

    float d = al.x;
    c = al.yzw;

    vec3 n = d - vec3
    (
        getDist(p - e.xyy).x,
        getDist(p - e.yxy).x,
        getDist(p - e.yyx).x
    );
    return normalize(n);
}


float shadow(in vec3 ro, in vec3 rd, float mint, float maxt)
{
    for(float t = mint; t < maxt;)
    {
        float h = getDist(ro + rd * t).x;
        if(h <0.5)  return 0.3;
        t += h;
    }
    return 1.0;
}


float softshadow(in vec3 ro, in vec3 rd, float mint, float maxt, float k)
{
    float res = 1.0;
    for (float t=mint; t<maxt;)
    {
        float h = getDist(ro + rd * t).x;
        if (h < 0.01)
            return 0.0;
        res = min(res, k * (h / t));
        t += h;
    }
    return res;
}


float softshadow2(in vec3 ro, in vec3 rd)
{
    for (float t = 0.01; t < 30.0;)
    {
        float d = getDist(ro + rd * t).x;
        if (d < 0.01)
        {

        }
    }
    return 0.0;
}


vec3 render(vec3 ro, vec3 rd, vec2 uv)
{
    vec3 dif;
    float d = rayMarch(ro, rd);
    vec3 p = ro + rd * d;

    if (d > 80.0)
    {
        //dif = vec3(0.7, 0.7, 0.9) - max(rd.y,0.0)*0.3;
        dif = clamp(normalize(vec3(98, 146, 226)) * uv.y + 0.1 * 4.5, 0.0, 1.0); //Sky color
        return dif;
    }

    vec3 lightPos = vec3(5, 3, 5);
    //lightPos *= rotateY(iTime);

    vec3 l = normalize(lightPos - p);
    vec3 c = vec3(1.0);
    vec3 n = GetNormal(p, c);

    #ifdef HALF_LAMBERT
    float nDot = 0.5 * dot(n, l) + 0.5;
    #else
    float nDot = dot(n, l);
    #endif

    dif = vec3(1.0, 1.0, 0.9) * c * clamp(nDot, 0.0, 1.0);

    #ifdef FLOOR_GRID
    if (p.y < 0.01)//floor color
    {
        dif -= float((int(p.x+100.0) % 2) ^ (int(p.z+100.0)) % 2) * 0.1;
    }
    #endif

    //dif *= shadow(p, lightPos - p, 0.02, 10.0);
    //dif *= softshadow(p, lightPos - p, 0.02, 15.0, 0.05);

    //float d2 = rayMarch(p + n * SURF_DIST * 2.0f, l);
    //if (d2 < length(lightPos - p) && p.y < 2.0)    dif*=0.3;

    return dif;
}


void main()
{
    mat3x3 rotateX = rotateX(-iMouse.x / 50.0);
    mat3x3 rotateY = rotateY(iMouse.y / 50.0);

    vec2 uv2 = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 uv = vec3(uv2, 1.0);

    vec3 cameraP = vec3(0.0, 0.0, 0.0);

    vec3 cameraDir = vec3(0.0, 0.0, 0.0);

    uv = rotateX * rotateY * uv;
    cameraP = rotateX * rotateY * cameraP;


    vec3 trs = vec3(cos(iTime / 10.) * 4.0, 0, sin(iTime / 10.) * 4.0) + vec3(0, 0, -2);

    cameraP += trs;
    uv += trs;
    vec3 rd = uv - cameraP;

    vec3 color = render(cameraP, rd, uv.xy);
    gl_FragColor = vec4(color, 1.0);
}
