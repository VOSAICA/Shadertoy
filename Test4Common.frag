const float c_minimumRayHitTime = 0.1f;
const float c_superFar = 10000.0f;
const float c_rayPosNormalNudge = 0.01f;
const int c_numBounces = 10;
const float c_FOVDegrees = 80.0f;
const float c_pi = 3.1415926536f;
const float c_twopi = 2.0f * c_pi;
const int c_numRendersPerFrame = 1;
const float c_exposure = 0.7;


vec3 LessThan(vec3 f, float value)
{
    return vec3
    (
        (f.x < value) ? 1.0f : 0.0f,
        (f.y < value) ? 1.0f : 0.0f,
        (f.z < value) ? 1.0f : 0.0f
    );
}


vec3 Linear2SRGB(vec3 rgb)
{
    rgb = clamp(rgb, 0.0f, 1.0f);

    return mix
    (
        pow(rgb, vec3(1.0f / 2.4f)) * 1.055f - 0.055f,
        rgb * 12.92f,
        LessThan(rgb, 0.0031308f)
    );
}


vec3 SRGB2Linear(vec3 rgb)
{
    return rgb;

    rgb = clamp(rgb, 0.0f, 1.0f);

    return mix
    (
        pow(((rgb + 0.055f) / 1.055f), vec3(2.4f)),
        rgb / 12.92f,
        LessThan(rgb, 0.04045f)
    );
}


vec3 ACESFilm(vec3 x)
{
    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0f, 1.0f);
}
