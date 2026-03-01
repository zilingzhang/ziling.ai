import { cloneWithMaterials, setCloneOpacity, setCloneEmissive, disposeClone } from './helpers.js';

export default {
    name: 'DMC Aerial',
    label: 'comboing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._es = this._origScale.x * 0.8; // enemy scale relative to model

        // "Enemy" clawd - clone of the real model, tinted purple
        this._enemy = cloneWithMaterials(model);
        setCloneOpacity(this._enemy, 0);
        setCloneEmissive(this._enemy, 0x6633aa, 0.4);
        this._enemy.visible = false;
        this._enemy.position.set(this._origPos.x - 1.0, this._origPos.y, 0);
        this._enemy.scale.setScalar(this._es);
        scene.add(this._enemy);

        // Colorful projectile balls
        this._ballPool = [];
        this._activeBalls = [];
        var ballGeo = new THREE.SphereGeometry(0.06, 8, 8);
        var ballColors = [0xff3366, 0x33ccff, 0xffcc00, 0x66ff66, 0xff6600,
                          0xcc33ff, 0x00ffcc, 0xff0066, 0x3366ff, 0xffff33,
                          0xff3300, 0x00ff99, 0xff66cc, 0x6633ff, 0x33ff66];
        for (var i = 0; i < 15; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: ballColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ball = new THREE.Mesh(ballGeo, bMat);
            ball.visible = false;
            scene.add(ball);
            this._ballPool.push({
                mesh: ball, active: false,
                vx: 0, vy: 0, vz: 0,
                life: 0, maxLife: 0,
                trail: []
            });
        }
        this._ballIdx = 0;

        // Impact flash rings
        this._flashes = [];
        var flashGeo = new THREE.RingGeometry(0.05, 0.15, 16);
        for (var f = 0; f < 5; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            var flash = new THREE.Mesh(flashGeo, fMat);
            flash.visible = false;
            scene.add(flash);
            this._flashes.push({ mesh: flash, life: 0, maxLife: 0.25 });
        }
        this._flashIdx = 0;

        // Trail particles for balls
        this._trails = [];
        var trailGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var tr = 0; tr < 30; tr++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._trails.push({ mesh: trail, life: 0, maxLife: 0.2 });
        }
        this._trailIdx = 0;

        this._lastShot = 0;
        this._enemyHits = 0;
    },
    _fireBall(fromX, fromY, toX, toY, speed, THREE) {
        var b = this._ballPool[this._ballIdx % this._ballPool.length];
        this._ballIdx++;
        b.active = true;
        b.mesh.visible = true;
        b.mesh.position.set(fromX, fromY, 0);
        var dx = toX - fromX, dy = toY - fromY;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        b.vx = (dx / len) * speed;
        b.vy = (dy / len) * speed;
        b.vz = (Math.random() - 0.5) * 0.5;
        b.life = 0.6;
        b.maxLife = 0.6;
        b.mesh.material.opacity = 1.0;
        b.mesh.scale.setScalar(1);
    },
    _spawnFlash(x, y) {
        var f = this._flashes[this._flashIdx % this._flashes.length];
        this._flashIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y, 0.1);
        f.life = f.maxLife;
        f.mesh.material.opacity = 1.0;
        f.mesh.scale.setScalar(0.5);
    },
    _spawnTrail(x, y, z, color) {
        var t = this._trails[this._trailIdx % this._trails.length];
        this._trailIdx++;
        t.mesh.visible = true;
        t.mesh.position.set(x, y, z);
        t.mesh.material.color.set(color);
        t.life = t.maxLife;
        t.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var enemyBaseX = orig.x - 1.2, enemyBaseY = orig.y;

        if (progress < 0.1) {
            // Intro: enemy appears, model squares up
            var t = progress / 0.1;
            this._enemy.visible = true;
            setCloneOpacity(this._enemy, t * 0.8);
            this._enemy.position.set(enemyBaseX, enemyBaseY, 0);
            this._enemy.scale.setScalar(this._es * t);
            // Model leans back preparing
            model.rotation.z = -t * 0.1;
        } else if (progress < 0.25) {
            // Launch enemy into air with first volley
            var t2 = (progress - 0.1) / 0.15;
            var launchY = enemyBaseY + t2 * 1.8;
            this._enemy.position.set(enemyBaseX + Math.sin(time * 8) * 0.05, launchY, 0);
            setCloneOpacity(this._enemy, 0.8);
            this._enemy.rotation.z = t2 * Math.PI * 2; // spinning from hit

            // Rapid fire balls upward
            if (time - this._lastShot > 0.12) {
                this._fireBall(orig.x, orig.y + 0.8, enemyBaseX, launchY, 5.0, THREE);
                this._lastShot = time;
                model.rotation.z = (Math.random() - 0.5) * 0.15; // recoil
            }
        } else if (progress < 0.65) {
            // Aerial juggle: enemy floats high, balls keep it up
            var t3 = (progress - 0.25) / 0.4;
            var juggleY = enemyBaseY + 1.8 + Math.sin(time * 3) * 0.3;
            var juggleX = enemyBaseX + Math.sin(time * 1.5) * 0.4;
            this._enemy.position.set(juggleX, juggleY, 0);
            this._enemy.rotation.z += delta * 6; // continuous spin

            // Hit stagger
            var stagger = Math.sin(time * 12) * 0.03;
            this._enemy.position.x += stagger;

            // Fire from alternating sides
            if (time - this._lastShot > 0.15) {
                var side = this._enemyHits % 2 === 0 ? -1 : 1;
                var shootFromX = orig.x + side * 0.3;
                this._fireBall(shootFromX, orig.y + 0.5, juggleX, juggleY, 6.0, THREE);
                this._lastShot = time;
                this._enemyHits++;
                model.rotation.z = side * 0.12;
            }

            // Model does a fighting stance bob
            model.position.y = orig.y + Math.abs(Math.sin(time * 4)) * 0.08;
        } else if (progress < 0.8) {
            // Final burst: model jumps up and unleashes barrage
            var t4 = (progress - 0.65) / 0.15;
            var jumpY = orig.y + Math.sin(t4 * Math.PI) * 1.2;
            model.position.y = jumpY;
            model.rotation.z = Math.sin(time * 10) * 0.1;

            var enemyFinalY = enemyBaseY + 1.8 - t4 * 0.5;
            this._enemy.position.set(enemyBaseX, enemyFinalY, 0);
            this._enemy.rotation.z += delta * 10;
            this._enemy.scale.setScalar(this._es * (1.0 - t4 * 0.2)); // shrinking from hits

            // Rapid burst fire
            if (time - this._lastShot > 0.06) {
                var angle = this._enemyHits * 0.7;
                this._fireBall(
                    model.position.x + Math.cos(angle) * 0.2,
                    jumpY + 0.3,
                    enemyBaseX, enemyFinalY, 8.0, THREE
                );
                this._lastShot = time;
                this._enemyHits++;
            }
        } else if (progress < 0.9) {
            // Enemy falls defeated
            var t5 = (progress - 0.8) / 0.1;
            model.position.y = orig.y;
            model.rotation.z = 0;

            var fallY = enemyBaseY + 1.3 - t5 * 2.5;
            this._enemy.position.set(enemyBaseX + t5 * 0.3, fallY, 0);
            this._enemy.rotation.z += delta * 5 * (1 - t5);
            setCloneOpacity(this._enemy, 0.8 * (1 - t5));
            this._enemy.scale.setScalar(this._es * (1 - t5 * 0.5));

            // Final impact flash
            if (t5 > 0.7 && t5 < 0.75) {
                this._spawnFlash(enemyBaseX, orig.y + 0.2);
            }
        } else {
            // Cooldown: model returns to rest
            var t6 = (progress - 0.9) / 0.1;
            model.position.y = orig.y;
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
            this._enemy.visible = false;
        }

        // Update active balls
        for (var i = 0; i < this._ballPool.length; i++) {
            var ball = this._ballPool[i];
            if (!ball.active) continue;
            ball.life -= delta;
            if (ball.life <= 0) {
                ball.active = false;
                ball.mesh.visible = false;
                continue;
            }
            ball.mesh.position.x += ball.vx * delta;
            ball.mesh.position.y += ball.vy * delta;
            ball.mesh.position.z += ball.vz * delta;
            ball.vz *= 0.95; // dampen z drift
            var lr = ball.life / ball.maxLife;
            ball.mesh.material.opacity = lr;
            ball.mesh.scale.setScalar(0.5 + lr * 0.5);

            // Spawn trail
            if (Math.random() < 0.5) {
                this._spawnTrail(
                    ball.mesh.position.x, ball.mesh.position.y,
                    ball.mesh.position.z, ball.mesh.material.color
                );
            }

            // Check if ball reached enemy vicinity - spawn flash
            if (this._enemy.visible) {
                var dx = ball.mesh.position.x - this._enemy.position.x;
                var dy = ball.mesh.position.y - this._enemy.position.y;
                if (Math.sqrt(dx * dx + dy * dy) < 0.3) {
                    this._spawnFlash(this._enemy.position.x, this._enemy.position.y);
                    ball.life = 0;
                    ball.active = false;
                    ball.mesh.visible = false;
                }
            }
        }

        // Update flashes
        for (var fi = 0; fi < this._flashes.length; fi++) {
            var fl = this._flashes[fi];
            if (fl.life <= 0) continue;
            fl.life -= delta;
            if (fl.life <= 0) { fl.mesh.visible = false; continue; }
            var fp = fl.life / fl.maxLife;
            fl.mesh.material.opacity = fp;
            fl.mesh.scale.setScalar(0.5 + (1 - fp) * 2.0);
        }

        // Update trails
        for (var ti = 0; ti < this._trails.length; ti++) {
            var trl = this._trails[ti];
            if (trl.life <= 0) continue;
            trl.life -= delta;
            if (trl.life <= 0) { trl.mesh.visible = false; continue; }
            trl.mesh.material.opacity = 0.4 * (trl.life / trl.maxLife);
            trl.mesh.scale.setScalar(trl.life / trl.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._enemy) { disposeClone(this._enemy); scene.remove(this._enemy); this._enemy = null; }
        if (this._ballPool) { this._ballPool.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); this._ballPool = null; }
        if (this._flashes) { this._flashes.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); this._flashes = null; }
        if (this._trails) { this._trails.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); this._trails = null; }
    }
};
