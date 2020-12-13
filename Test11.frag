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


float sdOctahedron( vec3 p, float s)
{
  p = abs(p);
  float m = p.x+p.y+p.z-s;
  vec3 q;
       if( 3.0*p.x < m ) q = p.xyz;
  else if( 3.0*p.y < m ) q = p.yzx;
  else if( 3.0*p.z < m ) q = p.zxy;
  else return m*0.57735027;

  float k = clamp(0.5*(q.z-q.y+s),0.0,s); 
  return length(vec3(q.x,q.y-s+k,q.z-k)); 
}


vec4 getDist(vec3 p)
{
    vec4 d = vec4(1e10, 0.0, 0.0, 0.0);
    mat3x3 rotateX = rotateX(iTime);
    mat3x3 rotateY = rotateY(iTime);

    d = minDist(d, vec4(sdSphere(p - vec3(-1, -0.5, 2.0), 0.5), 1.0, 0.83, 0.4));
    d = minDist(d, vec4(sdPlane(p), 1.0, 1.0, 1.0));
    d = minDist(d, vec4(sdOctahedron(p - vec3(3, cos(iTime), -1.0), 1.0), 0.5, 0.2, 0.6));
    //d = minDist(d, vec4(sdBox(p - vec3(1, -0.5, 2), vec3(0.5, 0.5, 0.5)), 0.5, 0.5, 1));
    d = minDist(d, vec4(sdBox(rotateX * rotateY * p - rotateX * rotateY * vec3(0.6, 0.5, 2), vec3(0.6, 0.6, 0.6)), 0.5, 0.5, 1));
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


vec3 getNormal(vec3 p, out vec3 c)
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
        if(h <0.001)  return 0.4;
        t += h;
    }
    return 1.0;
}


float softshadow(in vec3 ro, in vec3 rd, float mint, float maxt, float k)
{
    #if 0
    float res = 1.0;
    for (float t=mint; t<maxt;)
    {
        float d = getDist(ro + rd * t).x;
        if (d < 0.001)  return 0.3;
        res = max(0.3, min(res, k * (d / t)));
        t += d;
    }
    return res;
    #else
    float res = 1.0;
    float ph = 1e20;
    for( float t=mint; t<maxt; )
    {
        float h = getDist(ro + rd * t).x;
        if(h<0.001)
            return 0.3;
        float y = h*h/(2.0*ph);
        float d = sqrt(h*h-y*y);
        res = max(0.3, min(res, k * d / max(0.0, t - y)));
        ph = h;
        t += h;
    }
    return res;
    #endif
}


vec3 render(vec3 ro, vec3 rd, vec2 uv)
{
    vec3 dif;
    float d = rayMarch(ro, rd);
    vec3 p = ro + rd * d;

    if (d > 50.0)
    {
        dif = vec3(0.38, 0.57, 0.88) - max(rd.y,0.0)*0.8;
        //dif = clamp(normalize(vec3(98, 146, 226)) * uv.y + 0.1 * 4.5, 0.0, 1.0); //Sky color
        return dif;
    }

    vec3 lightPos = vec3(2, 15, 2);
    lightPos.x += cos(iTime) * 8.0;
    lightPos.z += sin(iTime) * 8.0;

    vec3 l = normalize(lightPos - p);
    vec3 c = vec3(1.0);
    vec3 n = getNormal(p, c);

    #ifdef HALF_LAMBERT
    float nDot = 0.5 * dot(n, l) + 0.5;
    #else
    float nDot = dot(n, l);
    #endif

    dif = vec3(1.0, 1.0, 0.9) * c * clamp(nDot, 0.0, 1.0);

    #ifdef FLOOR_GRID
    if (p.y < -0.98 || abs(p.x)> 20.0 || abs(p.z) > 20.0)//floor color
    {
        dif -= float((int(p.x+100.0) % 2) ^ (int(p.z+100.0)) % 2) * 0.1;
        dif *= softshadow(p, l, 0.02, 10.0, 6.0);
    }
    else
    {
        //dif *= shadow(p, l, 0.1, 5.0);
    }
    #endif

    return dif;
}


void main()
{
    mat3x3 rotateX = rotateX((-iMouse.x / iResolution.x) * 20.0);
    mat3x3 rotateY = rotateY((iMouse.y / iResolution.y) * 2.0);

    vec2 uv2 = (gl_FragCoord.xy - 0.5f * iResolution.xy) / iResolution.y;
    vec3 uv = vec3(uv2, 1.0);
    vec3 cameraP = vec3(0.0, 0.0, 0.0);

    uv = rotateX * rotateY * uv;
    cameraP = rotateX * rotateY * cameraP;

    vec3 trs = vec3(0, 0, -2);

    cameraP += trs;
    uv += trs;
    vec3 rd = normalize(uv - cameraP);

    vec3 color = render(cameraP, rd, uv.xy);
    gl_FragColor = vec4(color, 1.0);
}
