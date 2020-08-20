#include "Test5Common.frag"
#iKeyboard
#iChannel0 "self"

uint wang_hash(inout uint seed)
{
	seed = uint(seed ^ uint(61)) ^ uint(seed >> uint(16));
    seed *= uint(9);
    seed = seed ^ (seed >> 4);
    seed *= uint(0x27d4eb2d);
    seed = seed ^ (seed >> 15);
    return seed;
}


float RandomFloat01(inout uint state)
{
	return float(wang_hash(state)) / 4294967296.0f;
}


vec3 RandomUnitVector(inout uint state)
{
	float z = RandomFloat01(state) * 2.0f - 1.0f;
	float a = RandomFloat01(state) * c_twopi;
	float r = sqrt(1.0f - z * z);
	float x = r * cos(a);
	float y = r * sin(a);
	return vec3(x, y, z);
}

struct SMaterialInfo
{
    vec3 albedo;
    vec3 emissive;
    vec3 specularColor;
    float specularChance;
    float specularRoughness;
    float IOR;
    float refractionChance;
    float refractionRoughness;
    vec3 refractionColor;
};


SMaterialInfo GetZeroedMaterial()
{
    SMaterialInfo ret;
    ret.albedo = vec3(0.0f, 0.0f, 0.0f);
    ret.emissive = vec3(0.0f, 0.0f, 0.0f);
    ret.specularChance = 0.0f;
    ret.specularRoughness = 0.0f;
    ret.specularColor = vec3(0.0f, 0.0f, 0.0f);
    ret.IOR = 1.0f;
    ret.refractionChance = 0.0f;
    ret.refractionRoughness = 0.0f;
    ret.refractionColor = vec3(0.0f, 0.0f, 0.0f);
    return ret;
}


struct SRayHitInfo
{
	float dist;
	vec3 normal;
    bool fromInside;
    SMaterialInfo material;
};


float ScalarTriple(vec3 u, vec3 v, vec3 w)
{
	return dot(cross(u, v), w);
}


bool TestQuadTrace(in vec3 rayPos, in vec3 rayDir, inout SRayHitInfo info, in vec3 a, in vec3 b, in vec3 c, in vec3 d)
{
	// calculate normal and flip vertices order if needed
	vec3 normal = normalize(cross(c-a, c-b));
	if (dot(normal, rayDir) > 0.0f)
	{
		normal *= -1.0f;

		vec3 temp = d;
		d = a;
		a = temp;

		temp = b;
		b = c;
		c = temp;
	}

	vec3 p = rayPos;
	vec3 q = rayPos + rayDir;
	vec3 pq = q - p;
	vec3 pa = a - p;
	vec3 pb = b - p;
	vec3 pc = c - p;

	// determine which triangle to test against by testing against diagonal first
	vec3 m = cross(pc, pq);
	float v = dot(pa, m);
	vec3 intersectPos;
	if (v >= 0.0f)
	{
		// test against triangle a,b,c
		float u = -dot(pb, m);
		if (u < 0.0f) return false;
		float w = ScalarTriple(pq, pb, pa);
		if (w < 0.0f) return false;
		float denom = 1.0f / (u+v+w);
		u*=denom;
		v*=denom;
		w*=denom;
		intersectPos = u*a+v*b+w*c;
	}
	else
	{
		vec3 pd = d - p;
		float u = dot(pd, m);
		if (u < 0.0f) return false;
		float w = ScalarTriple(pq, pa, pd);
		if (w < 0.0f) return false;
		v = -v;
		float denom = 1.0f / (u+v+w);
		u*=denom;
		v*=denom;
		w*=denom;
		intersectPos = u*a+v*d+w*c;
	}

	float dist;
	if (abs(rayDir.x) > 0.1f)
	{
		dist = (intersectPos.x - rayPos.x) / rayDir.x;
	}
	else if (abs(rayDir.y) > 0.1f)
	{
		dist = (intersectPos.y - rayPos.y) / rayDir.y;
	}
	else
	{
		dist = (intersectPos.z - rayPos.z) / rayDir.z;
	}

	if (dist > c_minimumRayHitTime && dist < info.dist)
	{
		info.dist = dist;
		info.normal = normal;
        info.fromInside = false;
		return true;
	}

	return false;
}


bool TestSphereTrace(in vec3 rayPos, in vec3 rayDir, inout SRayHitInfo info, in vec4 sphere)
{
	//get the vector from the center of this sphere to where the ray begins.
	vec3 m = rayPos - sphere.xyz;

	//get the dot product of the above vector and the ray's vector
	float b = dot(m, rayDir);

	float c = dot(m, m) - sphere.w * sphere.w;

	//exit if r's origin outside s (c > 0) and r pointing away from s (b > 0)
	if(c > 0.0 && b > 0.0)
		return false;

	//calculate discriminant
	float discr = b * b - c;

	//a negative discriminant corresponds to ray missing sphere
	if(discr < 0.0)
		return false;

	//ray now found to intersect sphere, compute smallest t value of intersection
	bool fromInside = false;
	float dist = -b - sqrt(discr);
	if (dist < 0.0f)
	{
		fromInside = true;
		dist = -b + sqrt(discr);
	}

	if (dist > c_minimumRayHitTime && dist < info.dist)
	{
        info.fromInside = fromInside;
		info.dist = dist;
		info.normal = normalize((rayPos+rayDir*dist) - sphere.xyz) * (fromInside ? -1.0f : 1.0f);
		return true;
	}

	return false;
}


void TestSceneTrace(in vec3 rayPos, in vec3 rayDir, inout SRayHitInfo hitInfo)
{
    // floor
    {
        vec3 A = vec3(-25.0f, -12.5f, 5.0f);
        vec3 B = vec3( 25.0f, -12.5f, 5.0f);
        vec3 C = vec3( 25.0f, -12.5f, -5.0f);
        vec3 D = vec3(-25.0f, -12.5f, -5.0f);
        if (TestQuadTrace(rayPos, rayDir, hitInfo, A, B, C, D))
        {
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.7f, 0.7f, 0.7f);         
        }        
    }
    
    // striped background
    {
        vec3 A = vec3(-25.0f, -1.5f, 5.0f);
        vec3 B = vec3( 25.0f, -1.5f, 5.0f);
        vec3 C = vec3( 25.0f, -10.5f, 5.0f);
        vec3 D = vec3(-25.0f, -10.5f, 5.0f);
        if (TestQuadTrace(rayPos, rayDir, hitInfo, A, B, C, D))
        {
            hitInfo.material = GetZeroedMaterial();
            
            vec3 hitPos = rayPos + rayDir * hitInfo.dist;
            
            float shade = floor(mod(hitPos.x, 1.0f) * 2.0f);
            hitInfo.material.albedo = vec3(shade, shade, shade);
        }        
    }
    
    // cieling piece above light
    {
        vec3 A = vec3(-7.5f, 12.5f, 5.0f);
        vec3 B = vec3( 7.5f, 12.5f, 5.0f);
        vec3 C = vec3( 7.5f, 12.5f, -5.0f);
        vec3 D = vec3(-7.5f, 12.5f, -5.0f);
        if (TestQuadTrace(rayPos, rayDir, hitInfo, A, B, C, D))
        {
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.7f, 0.7f, 0.7f);
        }        
    }    
    
    // light
    {
        vec3 A = vec3(-5.0f, 12.4f,  2.5f);
        vec3 B = vec3( 5.0f, 12.4f,  2.5f);
        vec3 C = vec3( 5.0f, 12.4f,  -2.5f);
        vec3 D = vec3(-5.0f, 12.4f,  -2.5f);
        if (TestQuadTrace(rayPos, rayDir, hitInfo, A, B, C, D))
        {
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.emissive = vec3(1.0f, 0.9f, 0.7f) * 20.0f;   
        }        
    }    
    
#if SCENE == 0
    
    const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -8.0f, 00.0f, 2.8f)))
        {
            float r = float(sphereIndex) / float(c_numSpheres-1) * 0.5f;
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = r;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = 1.1f;
            hitInfo.material.refractionChance = 1.0f;
            hitInfo.material.refractionRoughness = r;
            hitInfo.material.refractionColor = vec3(0.0f, 0.5f, 1.0f);
    	} 
    }
    
#elif SCENE == 1

	const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -8.0f, 0.0f, 2.8f)))
        {
            float ior = 1.0f + 0.5f * float(sphereIndex) / float(c_numSpheres-1);
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = 0.0f;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = ior;
            hitInfo.material.refractionChance = 1.0f;
            hitInfo.material.refractionRoughness = 0.0f;
    	} 
    }
    
#elif SCENE == 2

	const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -8.0f, 0.0f, 2.8f)))
        {
            float ior = 1.0f + 1.0f * float(sphereIndex) / float(c_numSpheres-1);
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = 0.0f;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = ior;
            hitInfo.material.refractionChance = 0.0f;
    	} 
    }  
    
#elif SCENE == 3

	const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -8.0f, 0.0f, 2.8f)))
        {
            float absorb = float(sphereIndex) / float(c_numSpheres-1);
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = 0.0f;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = 1.1f;
            hitInfo.material.refractionChance = 1.0f;
            hitInfo.material.refractionRoughness = 0.0f;
            hitInfo.material.refractionColor = vec3(1.0f, 2.0f, 3.0f) * absorb;
    	} 
    }    
    
#elif SCENE == 4

	const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -9.0f + 0.75f * float(sphereIndex), 0.0f, 2.8f)))
        {            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = 0.0f;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = 1.5f;
            hitInfo.material.refractionChance = 1.0f;
            hitInfo.material.refractionRoughness = 0.0f;
    	} 
    }      
    
#elif SCENE == 5
    
	const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -9.0f, 0.0f, 2.8f)))
        {
            float transparency = float(sphereIndex) / float(c_numSpheres-1);
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = 0.0f;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = 1.1f;
            hitInfo.material.refractionChance = 1.0f - transparency;
            hitInfo.material.refractionRoughness = 0.0f;
    	} 
    }        
    
#elif SCENE == 6
    
    const int c_numSpheres = 7;
    for (int sphereIndex = 0; sphereIndex < c_numSpheres; ++sphereIndex)
    {
		if (TestSphereTrace(rayPos, rayDir, hitInfo, vec4(-18.0f + 6.0f * float(sphereIndex), -8.0f, 00.0f, 2.8f)))
        {
            float r = float(sphereIndex) / float(c_numSpheres-1) * 0.5f;
            
            hitInfo.material = GetZeroedMaterial();
            hitInfo.material.albedo = vec3(0.9f, 0.25f, 0.25f);
            hitInfo.material.emissive = vec3(0.0f, 0.0f, 0.0f);        
            hitInfo.material.specularChance = 0.02f;
            hitInfo.material.specularRoughness = r;
            hitInfo.material.specularColor = vec3(1.0f, 1.0f, 1.0f) * 0.8f;
            hitInfo.material.IOR = 1.1f;
            hitInfo.material.refractionChance = 1.0f;
            hitInfo.material.refractionRoughness = r;
            hitInfo.material.refractionColor = vec3(0.0f, 0.0f, 0.0f);
    	} 
    }    
    
#endif
}


vec3 GetColorForRay(in vec3 startRayPos, in vec3 startRayDir, inout uint rngState)
{
	vec3 ret = vec3(0.0f, 0.0f, 0.0f);
	vec3 throughput = vec3(1.0f, 1.0f, 1.0f);
	vec3 rayPos = startRayPos;
	vec3 rayDir = startRayDir;

	for (int bounceIndex = 0; bounceIndex <= c_numBounces; ++bounceIndex)
	{
		SRayHitInfo hitInfo;
        hitInfo.material = GetZeroedMaterial();
		hitInfo.dist = c_superFar;
        hitInfo.fromInside = false;
		TestSceneTrace(rayPos, rayDir, hitInfo);

		if (hitInfo.dist == c_superFar) break;

        if (hitInfo.fromInside)
            throughput *= exp(-hitInfo.material.refractionColor * hitInfo.dist);

        float specularChance = hitInfo.material.specularChance;
        float refractionChance = hitInfo.material.refractionChance;


        float rayProbability = 1.0f;
        if (specularChance > 0.0f)
        {
            specularChance = FresnelReflectAmount
                             (
                             hitInfo.fromInside ? hitInfo.material.IOR : 1.0,
                             !hitInfo.fromInside ? hitInfo.material.IOR : 1.0,
                             rayDir,
                             hitInfo.normal,
                             hitInfo.material.specularChance,
                             1.0f
                             );
            
            float chanceMultiplier = (1.0f - specularChance) / (1.0f - hitInfo.material.specularChance);
            refractionChance *= chanceMultiplier;
        }

        float doSpecular = 0.0f;
        float doRefraction = 0.0f;
        float raySelectionRoll = RandomFloat01(rngState);
        //Wether or not to do the specular reflection ray
        if (specularChance > 0.0f && raySelectionRoll < specularChance)
        {
            doSpecular = 1.0f;
            rayProbability = specularChance;
        }
        else if (refractionChance > 0.0f && raySelectionRoll < specularChance + refractionChance)
        {
            doRefraction = 1.0f;
            rayProbability = refractionChance;
        }
        else
        {
            rayProbability = 1.0f - (specularChance + refractionChance);
        }
        rayProbability = max(rayProbability, 0.001f);

        if (doRefraction == 1.0f)
        {
            rayPos = (rayPos + rayDir * hitInfo.dist) - hitInfo.normal * c_rayPosNormalNudge;
        }
        else
        {
            rayPos = (rayPos + rayDir * hitInfo.dist) + hitInfo.normal * c_rayPosNormalNudge;
        }

        vec3 diffuseRayDir = normalize(hitInfo.normal + RandomUnitVector(rngState));

        vec3 specularRayDir = reflect(rayDir, hitInfo.normal);
        specularRayDir = normalize(mix(specularRayDir, diffuseRayDir, hitInfo.material.specularRoughness * hitInfo.material.specularRoughness));

        vec3 refractionRayDir = refract(rayDir, hitInfo.normal, hitInfo.fromInside ? hitInfo.material.IOR : 1.0f / hitInfo.material.IOR);
		refractionRayDir = normalize(mix(refractionRayDir, normalize(-hitInfo.normal + RandomUnitVector(rngState)), hitInfo.material.refractionRoughness * hitInfo.material.refractionRoughness));
        
        rayDir = mix(diffuseRayDir, specularRayDir, doSpecular);
        rayDir = mix(rayDir, refractionRayDir, doRefraction);

		ret += hitInfo.material.emissive * throughput;

        if (doRefraction == 0.0f)
            throughput *= mix(hitInfo.material.albedo, hitInfo.material.specularColor, doSpecular);

        throughput /= rayProbability;

        {
            float p = max(throughput.r, max(throughput.g, throughput.b));
            if (RandomFloat01(rngState) > p) break;
            throughput *= 1.0f / p;
        }
	}
	return ret;
}


const float c_minCameraAngle = 0.01f;
const float c_maxCameraAngle = (c_pi - 0.01f);
const vec3 c_cameraAt = vec3(0.0f, 0.0f, 0.0f);
const float c_cameraDistance = 20.0f;

void GetCameraVectors(out vec3 cameraPos, out vec3 cameraFwd, out vec3 cameraUp, out vec3 cameraRight)
{
    vec2 mouse = iMouse.xy;
    if (dot(mouse, vec2(1.0f, 1.0f))  == 0.0f)
    {
        cameraPos = vec3(0.0f, 0.0f, -c_cameraDistance);
        cameraFwd = vec3(0.0f, 0.0f, 1.0f);
        cameraUp = vec3(0.0f, 1.0f, 0.0f);
        cameraRight = vec3(1.0f, 0.0f, 0.0f);
        return;
    }

    float angleX = -mouse.x * 16.0f / float(iResolution.x);
    float angleY = mix(c_minCameraAngle, c_maxCameraAngle, mouse.y / float(iResolution));

    cameraPos.x = sin(angleX) * sin(angleY) * c_cameraDistance;
    cameraPos.y = -cos(angleY) * c_cameraDistance;
    cameraPos.z = cos(angleX) * sin(angleY) * c_cameraDistance;
     
    cameraPos += c_cameraAt;
     
    cameraFwd = normalize(c_cameraAt - cameraPos);
    cameraRight = normalize(cross(vec3(0.0f, 1.0f, 0.0f), cameraFwd));
    cameraUp = normalize(cross(cameraFwd, cameraRight));
}

void main()
{
	uint rngState = uint(uint(gl_FragCoord.x) * uint(1973) + uint(gl_FragCoord.y) * uint(9277) + uint(iFrame) * uint(26699)) | uint(1);

    vec3 cameraPos, cameraFwd, cameraUp, cameraRight;
    GetCameraVectors(cameraPos, cameraFwd, cameraUp, cameraRight);

    vec2 jitter = vec2(RandomFloat01(rngState), RandomFloat01(rngState)) - 0.5f;
    

    vec3 rayDir;
    {
        vec2 uvJittered = (gl_FragCoord.xy + jitter) / iResolution.xy;
        vec2 screen = uvJittered * 2.0f - 1.0f;

        float aspectRatio  = iResolution.x / iResolution.y;
        screen.y /= aspectRatio;
    
        float cameraDistance = tan(c_FOVDegrees * 0.5f * c_pi / 180.0f);
        rayDir = vec3(screen, cameraDistance);
        rayDir = normalize(mat3(cameraRight, cameraUp, cameraFwd) * rayDir);
    }

	vec3 color = vec3(0.0f, 0.0f, 0.0f);
	for (int i = 0; i < c_numRendersPerFrame; ++i)
		color += GetColorForRay(cameraPos, rayDir, rngState) / float(c_numRendersPerFrame);

	vec4 lastFrameColor = texture(iChannel0, gl_FragCoord.xy / iResolution.xy);

    float blend = (iFrame < 2 || iMouse.z > 0.0 || lastFrameColor.a == 0.0f || isKeyPressed(32)) ? 1.0f : 1.0f / (1.0f + (1.0f / lastFrameColor.a));
	color = mix(lastFrameColor.rgb, color, blend);

	gl_FragColor = vec4(color, blend);
}
