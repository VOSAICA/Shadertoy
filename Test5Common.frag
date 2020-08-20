const float c_minimumRayHitTime = 0.1f;
const float c_superFar = 10000.0f;
const float c_rayPosNormalNudge = 0.01f;
const int c_numBounces = 8;
const float c_FOVDegrees = 80.0f;
const float c_pi = 3.1415926536f;
const float c_twopi = 2.0f * c_pi;
const int c_numRendersPerFrame = 5;
const float c_exposure = 0.7f;
const float c_skyboxBrightnessMultiplier = 1.0f;
const float KEY_SPACE = 32.5/256.0;

// 0 = transparent orange spheres of increasing surface roughness
// 1 = transparent spheres of increasing IOR
// 2 = opaque spheres of increasing IOR
// 3 = transparent spheres of increasing absorption
// 4 = transparent spheres of various heights, to show hot spot focus/defocus
// 5 = transparent spheres becoming increasingly diffuse
// 6 = transparent spheres of increasing surface roughness
#define SCENE 6


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


float FresnelReflectAmount(float n1, float n2, vec3 normal, vec3 incident, float f0, float f90)
{
        // Schlick aproximation
        float r0 = (n1-n2) / (n1+n2);
        r0 *= r0;
        float cosX = -dot(normal, incident);
        if (n1 > n2)
        {
            float n = n1/n2;
            float sinT2 = n*n*(1.0-cosX*cosX);
            // Total internal reflection
            if (sinT2 > 1.0)
                return f90;
            cosX = sqrt(1.0-sinT2);
        }
        float x = 1.0-cosX;
        float ret = r0+(1.0-r0)*x*x*x*x*x;

        // adjust reflect multiplier for object reflectivity
        return mix(f0, f90, ret);
}
