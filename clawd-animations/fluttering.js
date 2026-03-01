export default {
    name: 'Fluttering',
    label: 'fluttering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Butterfly wing pairs
        this._butterflies = [];
        var wingColors = [
            [0xff88aa, 0xff66aa], [0xaabb55, 0x88cc44],
            [0x88aaff, 0x6688ee], [0xffcc44, 0xffaa22],
            [0xcc88ff, 0xaa66dd], [0xff9966, 0xdd7744],
            [0x66ddaa, 0x44bb88]
        ];

        for (var b = 0; b < 7; b++) {
            var wingGeo = new THREE.CircleGeometry(0.035, 6);
            var wMat1 = new THREE.MeshBasicMaterial({
                color: wingColors[b][0], transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false
            });
            var wMat2 = new THREE.MeshBasicMaterial({
                color: wingColors[b][1], transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false
            });
            var wing1 = new THREE.Mesh(wingGeo, wMat1);
            var wing2 = new THREE.Mesh(wingGeo, wMat2);
            wing1.visible = false;
            wing2.visible = false;
            scene.add(wing1);
            scene.add(wing2);

            // Figure-8 flight path parameters
            var pathAngle = Math.random() * Math.PI * 2;
            var pathRadius = 0.3 + Math.random() * 0.4;

            this._butterflies.push({
                wing1: wing1, wing2: wing2,
                pathPhase: Math.random() * Math.PI * 2,
                pathSpeed: 0.4 + Math.random() * 0.3,
                pathRadius: pathRadius,
                pathAngle: pathAngle,
                flapSpeed: 6 + Math.random() * 4,
                flapPhase: Math.random() * Math.PI * 2,
                landing: false,
                landTimer: 0,
                landDuration: 0.8 + Math.random() * 0.5,
                nextLandTime: 2 + Math.random() * 3
            });
        }

        // Scale dust trail particles
        this._dustTrail = [];
        var dustGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var d = 0; d < 25; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: d % 3 === 0 ? 0xffddaa : (d % 3 === 1 ? 0xddbbff : 0xaaddff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dustTrail.push({
                mesh: dust, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._dustIdx = 0;

        // Gentle ambient glow
        var glowGeo = new THREE.SphereGeometry(0.4, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffeecc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._ambientGlow = new THREE.Mesh(glowGeo, glowMat);
        this._ambientGlow.position.set(ox, oy, 0);
        scene.add(this._ambientGlow);

        this._elapsed = 0;
    },
    _spawnDust(x, y) {
        var d = this._dustTrail[this._dustIdx % this._dustTrail.length];
        this._dustIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(x, y, 0);
        d.vx = (Math.random() - 0.5) * 0.08;
        d.vy = -0.02 + Math.random() * 0.04;
        d.life = 0.3 + Math.random() * 0.3;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        this._elapsed += delta;

        var intensity = 0;

        // Phase 1: First butterflies appear (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            intensity = t;
        }
        // Phase 2: More butterflies, figure-8 flights (10-40%)
        else if (progress < 0.40) {
            intensity = 0.5 + ((progress - 0.10) / 0.30) * 0.5;
        }
        // Phase 3: Full flutter, some landing on model (40-70%)
        else if (progress < 0.70) {
            intensity = 1.0;
        }
        // Phase 4: Taking off, gentle departure (70-88%)
        else if (progress < 0.88) {
            intensity = 1.0 - ((progress - 0.70) / 0.18) * 0.3;
        }
        // Phase 5: Fade out (88-100%)
        else {
            var t5 = (progress - 0.88) / 0.12;
            intensity = 0.7 * (1 - t5);
            model.position.set(
                ox + 0.01 * (1 - t5),
                oy,
                oz
            );
            if (t5 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update butterflies
        var numActive = Math.ceil(intensity * this._butterflies.length);
        for (var b = 0; b < this._butterflies.length; b++) {
            var bf = this._butterflies[b];
            if (b >= numActive) {
                bf.wing1.visible = false;
                bf.wing2.visible = false;
                continue;
            }

            bf.wing1.visible = true;
            bf.wing2.visible = true;

            // Figure-8 path
            var pathT = time * bf.pathSpeed + bf.pathPhase;
            var fig8X = Math.sin(pathT) * bf.pathRadius;
            var fig8Y = Math.sin(pathT * 2) * bf.pathRadius * 0.4;

            var bx = ox + fig8X;
            var by = oy + fig8Y;

            // Landing behavior
            bf.nextLandTime -= delta;
            if (bf.nextLandTime <= 0 && !bf.landing && progress > 0.30 && progress < 0.75) {
                bf.landing = true;
                bf.landTimer = bf.landDuration;
            }

            if (bf.landing) {
                bf.landTimer -= delta;
                // Land on model
                var landProgress = 1 - (bf.landTimer / bf.landDuration);
                bx = bx + (ox - bx) * Math.min(landProgress * 2, 1);
                by = by + (oy + 0.15 - by) * Math.min(landProgress * 2, 1);

                if (bf.landTimer <= 0) {
                    bf.landing = false;
                    bf.nextLandTime = 2 + Math.random() * 3;
                }
            }

            // Wing flap animation
            var flapAngle = Math.sin(time * bf.flapSpeed + bf.flapPhase);
            var flapScale = bf.landing ? 0.3 + Math.abs(flapAngle) * 0.2 : 0.5 + Math.abs(flapAngle) * 0.5;

            // Position wings as a pair
            var wingSpread = 0.04 * flapScale;
            bf.wing1.position.set(bx - wingSpread, by, 0);
            bf.wing2.position.set(bx + wingSpread, by, 0);
            bf.wing1.rotation.z = flapAngle * 0.4;
            bf.wing2.rotation.z = -flapAngle * 0.4;
            bf.wing1.scale.set(flapScale, 1, 1);
            bf.wing2.scale.set(flapScale, 1, 1);

            var wingOp = intensity * 0.7;
            bf.wing1.material.opacity = wingOp;
            bf.wing2.material.opacity = wingOp;

            // Spawn scale dust
            if (Math.random() < 0.04 * intensity && !bf.landing) {
                this._spawnDust(bx, by);
            }
        }

        // Ambient glow
        this._ambientGlow.material.opacity = intensity * 0.08 * (1 + Math.sin(time * 1.5) * 0.3);

        // Gentle model response
        if (progress < 0.88) {
            var gentleSway = Math.sin(time * 0.8) * 0.01 * intensity;
            model.position.set(ox + gentleSway, oy, oz);
        }

        // Update dust trail
        for (var di = 0; di < this._dustTrail.length; di++) {
            var dd = this._dustTrail[di];
            if (dd.life <= 0) continue;
            dd.life -= delta;
            if (dd.life <= 0) { dd.mesh.visible = false; continue; }
            dd.mesh.position.x += dd.vx * delta;
            dd.mesh.position.y += dd.vy * delta;
            dd.mesh.material.opacity = 0.5 * (dd.life / dd.maxLife);
            dd.mesh.scale.setScalar(0.7 + (1 - dd.life / dd.maxLife) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._butterflies) {
            this._butterflies.forEach(function(b) {
                scene.remove(b.wing1); b.wing1.geometry.dispose(); b.wing1.material.dispose();
                scene.remove(b.wing2); b.wing2.geometry.dispose(); b.wing2.material.dispose();
            });
        }
        if (this._dustTrail) { this._dustTrail.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._ambientGlow) { scene.remove(this._ambientGlow); this._ambientGlow.geometry.dispose(); this._ambientGlow.material.dispose(); }
        this._butterflies = this._dustTrail = this._ambientGlow = null;
    }
};