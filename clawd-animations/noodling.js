export default {
    name: 'Noodling',
    label: 'noodling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 6 noodle tendrils (long thin cylinders that wave)
        this._tendrils = [];
        for (var i = 0; i < 6; i++) {
            var segments = 8;
            var tendrilParts = [];
            var baseAngle = (Math.PI * 2 / 6) * i;
            var hue = i / 6;
            // Convert HSL-ish to color: noodle-yellow variations
            var noodleColors = [0xffdd66, 0xffcc44, 0xffe488, 0xffbb33, 0xffd555, 0xffc040];

            for (var j = 0; j < segments; j++) {
                var segLen = 0.04;
                var segRadius = 0.012 - j * 0.001;
                if (segRadius < 0.004) segRadius = 0.004;
                var segGeo = new THREE.CylinderGeometry(segRadius, segRadius, segLen, 6);
                var segMat = new THREE.MeshBasicMaterial({
                    color: noodleColors[i], transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var seg = new THREE.Mesh(segGeo, segMat);
                seg.visible = false;
                scene.add(seg);
                tendrilParts.push({ mesh: seg });
            }

            this._tendrils.push({
                parts: tendrilParts,
                baseAngle: baseAngle,
                waveFreq: 3 + i * 0.7,
                waveAmp: 0.08 + i * 0.01,
                length: 0, // animated extension
                maxLength: 0.25 + Math.random() * 0.1
            });
        }

        // Sauce splatter particles (red dots)
        this._sauce = [];
        var sauceGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var k = 0; k < 15; k++) {
            var sColors = [0xcc2200, 0xff3300, 0xdd4411, 0xee2211, 0xcc1100];
            var sMat = new THREE.MeshBasicMaterial({
                color: sColors[k % sColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sp = new THREE.Mesh(sauceGeo, sMat);
            sp.visible = false;
            scene.add(sp);
            this._sauce.push({ mesh: sp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._sauceIdx = 0;
        this._lastSauce = 0;

        this._wobbleIntensity = 0;
    },
    _splatSauce(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._sauce[this._sauceIdx % this._sauce.length];
            this._sauceIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 2.0;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.life = 0.5 + Math.random() * 0.5;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.9;
            s.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
        }
    },
    _updateTendrils(time, extensionFactor) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        for (var i = 0; i < this._tendrils.length; i++) {
            var t = this._tendrils[i];
            var targetLen = t.maxLength * extensionFactor;
            t.length += (targetLen - t.length) * 0.1;

            var baseX = ox + Math.cos(t.baseAngle) * 0.12;
            var baseY = oy + Math.sin(t.baseAngle) * 0.12;

            for (var j = 0; j < t.parts.length; j++) {
                var seg = t.parts[j];
                var segProgress = j / t.parts.length;
                var segDist = segProgress * t.length;

                if (segDist > t.length * 0.9 && extensionFactor < 0.5) {
                    seg.mesh.visible = false;
                    continue;
                }

                seg.mesh.visible = true;

                // Sine wave displacement increases along tendril length
                var waveOffset = Math.sin(time * t.waveFreq + segProgress * Math.PI * 3) * t.waveAmp * segProgress * this._wobbleIntensity;
                var waveOffset2 = Math.cos(time * t.waveFreq * 0.7 + segProgress * Math.PI * 2) * t.waveAmp * 0.5 * segProgress * this._wobbleIntensity;

                // Position along tendril direction with wave displacement
                var dirX = Math.cos(t.baseAngle);
                var dirY = Math.sin(t.baseAngle);
                // Perpendicular for wave
                var perpX = -dirY;
                var perpY = dirX;

                seg.mesh.position.set(
                    baseX + dirX * segDist + perpX * waveOffset,
                    baseY + dirY * segDist + perpY * waveOffset + waveOffset2,
                    0
                );

                // Rotate segment to follow wave curve
                var nextWave = Math.sin(time * t.waveFreq + (segProgress + 0.1) * Math.PI * 3) * t.waveAmp * (segProgress + 0.1) * this._wobbleIntensity;
                var tangentAngle = Math.atan2(nextWave - waveOffset, 0.04);
                seg.mesh.rotation.z = t.baseAngle - Math.PI * 0.5 + tangentAngle;

                seg.mesh.material.opacity = extensionFactor * 0.7;
            }
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Phase 1: First wobble
            var t = progress / 0.08;
            this._wobbleIntensity = t * 0.3;
            var wobble = Math.sin(time * 8) * t * 0.03;
            model.position.set(orig.x + wobble, orig.y + Math.sin(time * 6) * t * 0.02, orig.z);
            model.rotation.z = Math.sin(time * 7) * t * 0.05;
            model.scale.set(gs * (1 + Math.sin(time * 10) * t * 0.02), gs * (1 - Math.sin(time * 10) * t * 0.01), gs);
            this._updateTendrils(time, t * 0.3);
        } else if (progress < 0.30) {
            // Phase 2: Noodle tendrils extend, undulation begins
            var t2 = (progress - 0.08) / 0.22;
            this._wobbleIntensity = 0.3 + t2 * 0.5;
            var extension = t2;

            // Model wobbles with increasing intensity
            var wob = Math.sin(time * 8) * (0.03 + t2 * 0.04);
            model.position.set(
                orig.x + wob,
                orig.y + Math.sin(time * 5.5 + 0.5) * (0.02 + t2 * 0.03),
                orig.z
            );
            model.rotation.z = Math.sin(time * 6) * (0.05 + t2 * 0.06);
            // Wobbly scale
            var scaleWob = Math.sin(time * 9) * (0.02 + t2 * 0.02);
            model.scale.set(gs * (1 + scaleWob), gs * (1 - scaleWob * 0.7), gs);

            this._updateTendrils(time, extension);
        } else if (progress < 0.60) {
            // Phase 3: Full noodle mode, max wobble
            var t3 = (progress - 0.30) / 0.30;
            this._wobbleIntensity = 0.8 + Math.sin(time * 2) * 0.2;

            // Full sine wave position oscillation
            var noodleX = Math.sin(time * 4.5) * 0.08;
            var noodleY = Math.sin(time * 3.7 + 1.2) * 0.06;
            model.position.set(orig.x + noodleX, orig.y + noodleY, orig.z);
            model.rotation.z = Math.sin(time * 5.5) * 0.12;

            // Extreme wobbly scale
            var sWob = Math.sin(time * 7);
            model.scale.set(
                gs * (1 + sWob * 0.05),
                gs * (1 - sWob * 0.04),
                gs
            );

            this._updateTendrils(time, 1.0);
        } else if (progress < 0.75) {
            // Phase 4: Sauce splatter, peak silliness
            var t4 = (progress - 0.60) / 0.15;
            this._wobbleIntensity = 1.0;

            // Even more wobbly
            var nX = Math.sin(time * 5) * 0.1;
            var nY = Math.sin(time * 4 + 0.8) * 0.08;
            model.position.set(orig.x + nX, orig.y + nY, orig.z);
            model.rotation.z = Math.sin(time * 6) * 0.15;

            var sW = Math.sin(time * 8);
            model.scale.set(gs * (1 + sW * 0.06), gs * (1 - sW * 0.05), gs);

            // Sauce splatters
            if (time - this._lastSauce > 0.15) {
                this._splatSauce(
                    model.position.x + (Math.random() - 0.5) * 0.3,
                    model.position.y + (Math.random() - 0.5) * 0.2
                );
                this._lastSauce = time;
            }

            this._updateTendrils(time, 1.0);
        } else if (progress < 0.90) {
            // Phase 5: Tendrils retract, wobble diminishes
            var t5 = (progress - 0.75) / 0.15;
            this._wobbleIntensity = 1.0 - t5 * 0.8;
            var retraction = 1.0 - t5;

            var dampen = 1.0 - t5;
            model.position.set(
                orig.x + Math.sin(time * 4) * 0.06 * dampen,
                orig.y + Math.sin(time * 3.5 + 0.5) * 0.04 * dampen,
                orig.z
            );
            model.rotation.z = Math.sin(time * 5) * 0.08 * dampen;
            var dW = Math.sin(time * 7) * 0.03 * dampen;
            model.scale.set(gs * (1 + dW), gs * (1 - dW * 0.7), gs);

            this._updateTendrils(time, retraction);
        } else {
            // Phase 6: Solidify
            var t6 = (progress - 0.90) / 0.10;
            this._wobbleIntensity = 0.2 * (1 - t6);
            var tiny = (1 - t6) * 0.01;
            model.position.set(
                orig.x + Math.sin(time * 3) * tiny,
                orig.y,
                orig.z
            );
            model.rotation.z = Math.sin(time * 2) * tiny;
            model.scale.copy(this._origScale);

            this._updateTendrils(time, (1 - t6) * 0.2);

            // Fade tendrils fully
            for (var i = 0; i < this._tendrils.length; i++) {
                for (var j = 0; j < this._tendrils[i].parts.length; j++) {
                    this._tendrils[i].parts[j].mesh.material.opacity *= (1 - t6);
                }
            }
        }

        // Update sauce particles
        for (var si = 0; si < this._sauce.length; si++) {
            var sp = this._sauce[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 3.0 * delta;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.8;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tendrils) {
            this._tendrils.forEach(function(t) {
                t.parts.forEach(function(seg) {
                    scene.remove(seg.mesh);
                    seg.mesh.geometry.dispose();
                    seg.mesh.material.dispose();
                });
            });
        }
        if (this._sauce) {
            this._sauce.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._tendrils = this._sauce = null;
    }
};
