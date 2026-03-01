export default {
    name: 'Pondering',
    label: 'pondering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 3 thought bubble spheres (ascending size like comic thought bubbles)
        this._bubbles = [];
        var bubSizes = [0.025, 0.04, 0.065];
        var bubOffsets = [
            { x: 0.12, y: 0.12 },
            { x: 0.18, y: 0.22 },
            { x: 0.22, y: 0.35 }
        ];
        for (var i = 0; i < 3; i++) {
            var bubGeo = new THREE.SphereGeometry(bubSizes[i], 10, 10);
            var bubMat = new THREE.MeshBasicMaterial({
                color: 0xeeeeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bubMat);
            bub.position.set(ox + bubOffsets[i].x, oy + bubOffsets[i].y, 0);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub,
                offsetX: bubOffsets[i].x,
                offsetY: bubOffsets[i].y
            });
        }

        // Question mark made of 8 small positioned cubes
        this._questionCubes = [];
        var cubeGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
        // Question mark shape: arc on top + vertical stem + dot
        // Positions relative to the top thought bubble center
        var qCenter = { x: ox + 0.22, y: oy + 0.35 };
        var qPositions = [
            { x: -0.03, y: 0.08 },   // top-left of arc
            { x: 0.0, y: 0.10 },     // top of arc
            { x: 0.03, y: 0.08 },    // top-right of arc
            { x: 0.03, y: 0.05 },    // right side of arc
            { x: 0.01, y: 0.02 },    // bottom of arc curve
            { x: 0.0, y: -0.01 },    // stem top
            { x: 0.0, y: -0.03 },    // stem bottom
            { x: 0.0, y: -0.07 }     // dot
        ];
        for (var j = 0; j < 8; j++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: j === 7 ? 0xffcc44 : 0xddddff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cube = new THREE.Mesh(cubeGeo, cMat);
            cube.position.set(qCenter.x + qPositions[j].x, qCenter.y + qPositions[j].y, 0.03);
            cube.visible = false;
            scene.add(cube);
            this._questionCubes.push({
                mesh: cube,
                relX: qPositions[j].x,
                relY: qPositions[j].y,
                idx: j
            });
        }

        // Lightbulb sphere (bright yellow flash)
        var bulbGeo = new THREE.SphereGeometry(0.1, 12, 12);
        var bulbMat = new THREE.MeshBasicMaterial({
            color: 0xffee44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._lightbulb = new THREE.Mesh(bulbGeo, bulbMat);
        this._lightbulb.position.set(ox + 0.22, oy + 0.35, 0.05);
        this._lightbulb.visible = false;
        scene.add(this._lightbulb);

        // Eureka flash (big burst)
        var flashGeo = new THREE.SphereGeometry(0.5, 14, 14);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(ox + 0.22, oy + 0.35, 0);
        this._flash.visible = false;
        scene.add(this._flash);

        // 15 answer/eureka particles (gold, shower down)
        this._eurekaParticles = [];
        var epGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var k = 0; k < 15; k++) {
            var epMat = new THREE.MeshBasicMaterial({
                color: k % 3 === 0 ? 0xffdd44 : (k % 3 === 1 ? 0xffcc00 : 0xffee88),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ep = new THREE.Mesh(epGeo, epMat);
            ep.visible = false;
            scene.add(ep);
            this._eurekaParticles.push({
                mesh: ep,
                life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._epIdx = 0;
        this._eurekaFired = false;
    },
    _fireEureka(ox, oy) {
        for (var i = 0; i < 15; i++) {
            var ep = this._eurekaParticles[i];
            ep.mesh.visible = true;
            ep.mesh.position.set(ox + 0.22, oy + 0.35, 0.05);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.5;
            ep.vx = Math.cos(a) * spd * 0.5;
            ep.vy = Math.sin(a) * spd * 0.3 + 0.3;
            ep.vz = (Math.random() - 0.5) * 0.3;
            ep.life = 0.6 + Math.random() * 0.8;
            ep.maxLife = ep.life;
            ep.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Head tilt, first bubble
            var t = progress / 0.10;
            model.rotation.z = t * 0.06;
            model.position.set(ox, oy, oz);

            // First (smallest) thought bubble appears
            if (t > 0.4) {
                var bubFade = (t - 0.4) / 0.6;
                this._bubbles[0].mesh.visible = true;
                this._bubbles[0].mesh.material.opacity = bubFade * 0.5;
                this._bubbles[0].mesh.position.set(
                    ox + this._bubbles[0].offsetX,
                    oy + this._bubbles[0].offsetY + Math.sin(time * 2) * 0.005,
                    0
                );
            }
        } else if (progress < 0.35) {
            // Phase 2: Bubble chain grows, question cubes form
            var t2 = (progress - 0.10) / 0.25;
            model.rotation.z = 0.06 + Math.sin(time * 0.8) * 0.01;
            model.position.set(ox, oy + Math.sin(time * 1.2) * 0.005, oz);

            // All three bubbles
            for (var bi = 0; bi < 3; bi++) {
                if (t2 > bi * 0.25) {
                    var bFade = Math.min(1, (t2 - bi * 0.25) / 0.2);
                    this._bubbles[bi].mesh.visible = true;
                    this._bubbles[bi].mesh.material.opacity = bFade * 0.5;
                    this._bubbles[bi].mesh.position.set(
                        ox + this._bubbles[bi].offsetX,
                        oy + this._bubbles[bi].offsetY + Math.sin(time * 2 + bi) * 0.005,
                        0
                    );
                    this._bubbles[bi].mesh.scale.setScalar(0.5 + bFade * 0.5);
                }
            }

            // Question mark cubes form
            if (t2 > 0.4) {
                var qFade = (t2 - 0.4) / 0.6;
                for (var qi = 0; qi < 8; qi++) {
                    if (qFade > qi * 0.1) {
                        var qc = this._questionCubes[qi];
                        qc.mesh.visible = true;
                        var cubeFade = Math.min(1, (qFade - qi * 0.1) / 0.15);
                        qc.mesh.material.opacity = cubeFade * 0.7;
                    }
                }
            }
        } else if (progress < 0.60) {
            // Phase 3: Pondering cycle, question rotates
            var t3 = (progress - 0.35) / 0.25;
            model.rotation.z = 0.06 + Math.sin(time * 0.6) * 0.03;
            model.position.set(ox, oy + Math.sin(time * 1) * 0.008, oz);

            // Bubbles float gently
            for (var bj = 0; bj < 3; bj++) {
                this._bubbles[bj].mesh.material.opacity = 0.5 + Math.sin(time * 1.5 + bj) * 0.1;
                this._bubbles[bj].mesh.position.y = oy + this._bubbles[bj].offsetY + Math.sin(time * 1.5 + bj * 0.5) * 0.008;
            }

            // Question mark rotates slowly
            var qRotAngle = time * 1.5;
            for (var qj = 0; qj < 8; qj++) {
                var qc2 = this._questionCubes[qj];
                var qCenterX = ox + 0.22;
                var qCenterY = oy + 0.35;
                var rx = qc2.relX * Math.cos(qRotAngle * 0.2) - qc2.relY * Math.sin(qRotAngle * 0.05);
                var ry = qc2.relX * Math.sin(qRotAngle * 0.05) + qc2.relY * Math.cos(qRotAngle * 0.2);
                qc2.mesh.position.set(qCenterX + rx, qCenterY + ry, 0.03);
                qc2.mesh.material.opacity = 0.7 + Math.sin(time * 3 + qj * 0.5) * 0.15;
                qc2.mesh.rotation.y += delta * 2;
                qc2.mesh.rotation.x += delta * 1.5;
            }
        } else if (progress < 0.75) {
            // Phase 4: Lightbulb moment! Flash + eureka glow
            var t4 = (progress - 0.60) / 0.15;

            // Question cubes scatter
            for (var qk = 0; qk < 8; qk++) {
                var qc3 = this._questionCubes[qk];
                qc3.mesh.material.opacity = 0.7 * (1 - t4);
                if (qc3.mesh.material.opacity < 0.01) qc3.mesh.visible = false;
            }

            // Bubbles fade
            for (var bk = 0; bk < 3; bk++) {
                this._bubbles[bk].mesh.material.opacity = 0.5 * (1 - t4 * 0.5);
            }

            // Lightbulb appears
            this._lightbulb.visible = true;
            var bulbPulse = Math.sin(t4 * Math.PI);
            this._lightbulb.material.opacity = bulbPulse * 0.8;
            this._lightbulb.scale.setScalar(0.5 + bulbPulse * 1.5);

            // Flash
            if (t4 < 0.3) {
                this._flash.visible = true;
                this._flash.material.opacity = (t4 / 0.3) * 0.4;
                this._flash.scale.setScalar(1 + t4 * 3);
            } else {
                this._flash.material.opacity = 0.4 * (1 - (t4 - 0.3) / 0.7);
                this._flash.scale.setScalar(1 + t4 * 3);
            }

            // Fire eureka particles once
            if (!this._eurekaFired && t4 > 0.2) {
                this._fireEureka(ox, oy);
                this._eurekaFired = true;
            }

            model.rotation.z = 0.06 * (1 - t4);
            model.position.set(ox, oy + t4 * 0.02, oz);
        } else if (progress < 0.88) {
            // Phase 5: Answer particles shower down
            var t5 = (progress - 0.75) / 0.13;

            this._lightbulb.material.opacity = 0.6 * (1 - t5);
            this._lightbulb.scale.setScalar(1.5 + t5 * 0.5);
            this._flash.material.opacity = 0;
            this._flash.visible = false;

            // Bubbles fade completely
            for (var bl = 0; bl < 3; bl++) {
                this._bubbles[bl].mesh.material.opacity = 0.25 * (1 - t5);
            }

            model.position.set(ox, oy + 0.02 * (1 - t5), oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Settle satisfied
            var t6 = (progress - 0.88) / 0.12;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._lightbulb.material.opacity = 0;
            this._lightbulb.visible = false;
            for (var bm = 0; bm < 3; bm++) {
                this._bubbles[bm].mesh.material.opacity *= (1 - t6 * 0.1);
                if (this._bubbles[bm].mesh.material.opacity < 0.01) this._bubbles[bm].mesh.visible = false;
            }
        }

        // Update eureka particles (gravity + fade)
        for (var ei = 0; ei < this._eurekaParticles.length; ei++) {
            var ep = this._eurekaParticles[ei];
            if (ep.life <= 0) continue;
            ep.life -= delta;
            if (ep.life <= 0) { ep.mesh.visible = false; continue; }
            ep.mesh.position.x += ep.vx * delta;
            ep.mesh.position.y += ep.vy * delta;
            ep.mesh.position.z += ep.vz * delta;
            ep.vy -= 2.5 * delta; // gravity pulls them down
            var lr = ep.life / ep.maxLife;
            ep.mesh.material.opacity = lr * 0.8;
            ep.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bubbles) {
            this._bubbles.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._questionCubes) {
            this._questionCubes.forEach(function(q) {
                scene.remove(q.mesh); q.mesh.geometry.dispose(); q.mesh.material.dispose();
            });
        }
        if (this._lightbulb) { scene.remove(this._lightbulb); this._lightbulb.geometry.dispose(); this._lightbulb.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        if (this._eurekaParticles) {
            this._eurekaParticles.forEach(function(e) {
                scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose();
            });
        }
        this._bubbles = this._questionCubes = this._lightbulb = this._flash = this._eurekaParticles = null;
    }
};
