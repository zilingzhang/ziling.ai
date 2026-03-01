import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Code Reviewing',
    label: 'code-reviewing',
    duration: 14,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._cs = this._origScale.x * 0.35; // orbiter scale
        this._orbitCount = 8;
        this._orbitRadius = 0.7;

        // Formation group — everything moves together
        this._fleet = new THREE.Group();
        scene.add(this._fleet);

        // 8 orbiting clones
        this._orbiters = [];
        for (var i = 0; i < this._orbitCount; i++) {
            var clone = cloneWithMaterials(model);
            setCloneOpacity(clone, 0);
            clone.visible = false;
            var angle = (i / this._orbitCount) * Math.PI * 2;
            clone.userData.baseAngle = angle;
            clone.userData.bobPhase = Math.random() * Math.PI * 2;
            clone.userData.lastShot = -1;
            clone.userData.shotDelay = 0.6 + Math.random() * 0.8; // stagger fire timing
            this._fleet.add(clone);
            this._orbiters.push(clone);
        }

        // Colorful projectile ball pool
        this._balls = [];
        var ballGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var ballColors = [
            0xff3366, 0x33ccff, 0xffcc00, 0x66ff66, 0xff6600,
            0xcc33ff, 0x00ffcc, 0xff0066, 0x3366ff, 0xffff33,
            0xff3300, 0x00ff99, 0xff66cc, 0x6633ff, 0x33ff66,
            0xff9933, 0x33ffcc, 0xff33aa, 0x9966ff, 0x66ccff
        ];
        for (var b = 0; b < 20; b++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: ballColors[b % ballColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ball = new THREE.Mesh(ballGeo, bMat);
            ball.visible = false;
            this._fleet.add(ball);
            this._balls.push({
                mesh: ball, active: false,
                sx: 0, sy: 0, tx: 0, ty: 0,
                life: 0, maxLife: 0
            });
        }
        this._ballIdx = 0;

        // Impact sparkle ring pool
        this._sparks = [];
        var sparkGeo = new THREE.RingGeometry(0.02, 0.08, 12);
        for (var s = 0; s < 6; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            this._fleet.add(spark);
            this._sparks.push({ mesh: spark, life: 0, maxLife: 0.3 });
        }
        this._sparkIdx = 0;

        // Engine trail particles for formation flight feel
        this._trails = [];
        var trailGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var t = 0; t < 40; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: t % 2 === 0 ? 0x6699ff : 0x99ccff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail); // trails in world space so they stay behind
            this._trails.push({ mesh: trail, life: 0, maxLife: 0.6 });
        }
        this._trailIdx = 0;
        this._lastTrail = 0;
    },
    _fireBall(orbiterIdx, centerX, centerY) {
        var orb = this._orbiters[orbiterIdx];
        var b = this._balls[this._ballIdx % this._balls.length];
        this._ballIdx++;
        b.active = true;
        b.mesh.visible = true;
        b.sx = orb.position.x;
        b.sy = orb.position.y;
        b.tx = centerX;
        b.ty = centerY;
        b.mesh.position.set(b.sx, b.sy, orb.position.z);
        b.life = 0.4;
        b.maxLife = 0.4;
        b.mesh.material.opacity = 1.0;
        b.mesh.scale.setScalar(1);
    },
    _spawnSpark(x, y) {
        var s = this._sparks[this._sparkIdx % this._sparks.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.05);
        s.life = s.maxLife;
        s.mesh.material.opacity = 1.0;
        s.mesh.scale.setScalar(0.5);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var cs = this._cs;
        var orbitR = this._orbitRadius;
        var fleet = this._fleet;

        // Viewport center — where the camera looks
        var vcx = 0, vcy = -0.2;

        // --- Homeworld 2-style fleet path: sweeping 3D figure-8 / patrol loop ---
        var fleetX = 0, fleetY = 0, fleetZ = 0, fleetRoll = 0;
        var cruisePhase = 0;

        if (progress < 0.07) {
            // Phase 0: Slide to viewport center
            var t0 = progress / 0.07;
            var ease0 = t0 * t0 * (3 - 2 * t0); // smoothstep
            model.visible = true;
            model.scale.copy(this._origScale);
            model.position.set(
                orig.x + (vcx - orig.x) * ease0,
                orig.y + (vcy - orig.y) * ease0,
                orig.z
            );
            model.rotation.set(0, 0, 0);
            fleet.position.set(0, 0, 0);
            fleet.rotation.set(0, 0, 0);
            for (var i = 0; i < this._orbiters.length; i++) {
                this._orbiters[i].visible = false;
            }
        } else if (progress < 0.15) {
            // Phase 1: Formation assembles at viewport center
            var t = (progress - 0.07) / 0.08;
            var ease = t * t;

            model.visible = true;
            model.scale.setScalar(this._origScale.x * (1 - ease * 0.6));
            model.position.set(vcx, vcy, orig.z);

            fleet.position.set(0, 0, 0);
            fleet.rotation.set(0, 0, 0);

            // Clones spiral in from outside
            for (var i = 0; i < this._orbiters.length; i++) {
                var c = this._orbiters[i];
                var a = c.userData.baseAngle + time * 0.5;
                var r = orbitR * (2.0 - ease * 1.0);
                var appear = Math.max(0, (t - i * 0.08) / 0.4);
                appear = Math.min(appear, 1);
                c.visible = appear > 0;
                setCloneOpacity(c, appear * 0.85);
                c.position.set(
                    vcx + Math.cos(a) * r,
                    vcy + Math.sin(a) * r * 0.6,
                    Math.sin(a) * r * 0.3
                );
                c.scale.setScalar(cs * appear);
                c.rotation.z = Math.sin(a) * 0.1;
            }
        } else if (progress < 0.85) {
            // Phase 2: CRUISE — fleet patrols in Homeworld 2 style
            cruisePhase = (progress - 0.15) / 0.70;
            var pathT = cruisePhase * Math.PI * 2;

            // Lissajous patrol path — gentle sweeping turns
            fleetX = Math.sin(pathT) * 0.8;
            fleetY = Math.sin(pathT * 2) * 0.3;
            fleetZ = Math.cos(pathT) * 0.4;

            // Bank into turns like a capital ship
            var dx = Math.cos(pathT) * 0.8;
            fleetRoll = -dx * 0.1;

            fleet.position.set(0, 0, 0);
            fleet.rotation.set(0, 0, 0);

            // Center model — small target being reviewed
            var cx = vcx + fleetX;
            var cy = vcy + fleetY;
            var cz = fleetZ;
            model.visible = true;
            model.position.set(cx, cy, cz);
            model.scale.setScalar(this._origScale.x * 0.4);
            model.rotation.z = fleetRoll;
            model.rotation.y = Math.sin(time * 0.8) * 0.05;

            // Orbiters circle the center continuously
            var spinSpeed = time * 1.2;
            for (var j = 0; j < this._orbiters.length; j++) {
                var o = this._orbiters[j];
                var angle = o.userData.baseAngle + spinSpeed;
                var bob = Math.sin(time * 2.5 + o.userData.bobPhase) * 0.05;

                var ox = Math.cos(angle) * orbitR;
                var oy = Math.sin(angle) * orbitR * 0.5 + bob;
                var oz = Math.sin(angle) * orbitR * 0.4;

                o.visible = true;
                setCloneOpacity(o, 0.85);
                o.position.set(cx + ox, cy + oy, cz + oz);
                o.scale.setScalar(cs);
                o.rotation.z = fleetRoll + Math.sin(angle) * 0.15;
                o.rotation.y = Math.sin(time * 0.8 + o.userData.bobPhase) * 0.08;

                // Fire colorful balls at center
                if (cruisePhase > 0.05 && cruisePhase < 0.9) {
                    if (time - o.userData.lastShot > o.userData.shotDelay) {
                        this._fireBall(j, cx, cy);
                        o.userData.lastShot = time;
                        o.userData.shotDelay = 0.5 + Math.random() * 0.7;
                    }
                }
            }

            // Engine trails — spawn behind fleet center
            if (time - this._lastTrail > 0.04 && cruisePhase > 0.02) {
                var ti = this._trailIdx % this._trails.length;
                var tr = this._trails[ti];
                tr.mesh.visible = true;
                tr.mesh.position.set(
                    cx - Math.cos(pathT + Math.PI * 0.5) * 0.2 + (Math.random() - 0.5) * 0.15,
                    cy - 0.1 + (Math.random() - 0.5) * 0.1,
                    cz - 0.2
                );
                tr.life = tr.maxLife;
                tr.mesh.material.opacity = 0.4;
                tr.mesh.scale.setScalar(0.6 + Math.random() * 0.4);
                this._trailIdx++;
                this._lastTrail = time;
            }
        } else {
            // Phase 3: Formation dissolves, model returns to original position
            var t3 = (progress - 0.85) / 0.15;
            var ease3 = t3 * t3;

            fleet.position.set(0, 0, 0);
            fleet.rotation.set(0, 0, 0);

            model.visible = true;
            model.position.set(
                vcx + (orig.x - vcx) * ease3,
                vcy + (orig.y - vcy) * ease3,
                orig.z
            );
            model.scale.setScalar(this._origScale.x * (0.4 + ease3 * 0.6));
            model.rotation.z = 0;
            model.rotation.y = 0;

            for (var k = 0; k < this._orbiters.length; k++) {
                var oc = this._orbiters[k];
                setCloneOpacity(oc, 0.85 * (1 - ease3));
                oc.visible = ease3 < 0.95;
                var ca = oc.userData.baseAngle;
                var cr = orbitR * (1 - ease3);
                oc.position.set(
                    vcx + Math.cos(ca) * cr,
                    vcy + Math.sin(ca) * cr * 0.5,
                    Math.sin(ca) * cr * 0.4
                );
                oc.scale.setScalar(cs * (1 - ease3));
                oc.rotation.z = 0;
            }
        }

        // --- Update projectile balls ---
        for (var p = 0; p < this._balls.length; p++) {
            var ball = this._balls[p];
            if (!ball.active) continue;
            ball.life -= delta;
            if (ball.life <= 0) {
                ball.active = false;
                ball.mesh.visible = false;
                continue;
            }
            var bProg = 1 - (ball.life / ball.maxLife);
            // Ease-in curve toward center
            var ease2 = bProg * bProg;
            ball.mesh.position.x = ball.sx + (ball.tx - ball.sx) * ease2;
            ball.mesh.position.y = ball.sy + (ball.ty - ball.sy) * ease2;
            // Arc upward slightly
            ball.mesh.position.z += Math.sin(bProg * Math.PI) * 0.15 * delta * 3;
            ball.mesh.material.opacity = 1.0 - bProg * 0.3;
            ball.mesh.scale.setScalar(1.0 - bProg * 0.5);

            // Spawn impact spark when ball reaches center
            if (bProg > 0.85 && ball.life > 0) {
                this._spawnSpark(ball.tx, ball.ty);
                ball.active = false;
                ball.mesh.visible = false;
            }
        }

        // --- Update impact sparks ---
        for (var sp = 0; sp < this._sparks.length; sp++) {
            var spk = this._sparks[sp];
            if (spk.life <= 0) continue;
            spk.life -= delta;
            if (spk.life <= 0) { spk.mesh.visible = false; continue; }
            var sr = spk.life / spk.maxLife;
            spk.mesh.material.opacity = sr * 0.8;
            spk.mesh.scale.setScalar(0.5 + (1 - sr) * 1.5);
        }

        // --- Fade engine trails ---
        for (var tt = 0; tt < this._trails.length; tt++) {
            var tp = this._trails[tt];
            if (tp.life <= 0) continue;
            tp.life -= delta;
            if (tp.life <= 0) { tp.mesh.visible = false; continue; }
            var tr2 = tp.life / tp.maxLife;
            tp.mesh.material.opacity = 0.3 * tr2;
            tp.mesh.scale.setScalar((0.6 + (1 - tr2) * 0.4) * tr2);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.set(0, 0, 0);
        model.visible = true;
        if (this._orbiters) {
            for (var i = 0; i < this._orbiters.length; i++) disposeClone(this._orbiters[i]);
        }
        if (this._balls) {
            this._balls.forEach(function(b) { b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._sparks) {
            this._sparks.forEach(function(s) { s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._trails) {
            this._trails.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
        }
        if (this._fleet) scene.remove(this._fleet);
        this._orbiters = this._balls = this._sparks = this._trails = this._fleet = null;
    }
};
