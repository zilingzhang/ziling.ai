export default {
    name: 'Flibbertigibbeting',
    label: 'flibbertigibbeting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var gs = this._origScale.x;

        // Scene bounds for bouncing
        this._boundsX = 1.2;
        this._boundsY = 0.8;

        // Current bounce velocity
        this._velX = 1.8;
        this._velY = 2.2;
        this._posX = this._origPos.x;
        this._posY = this._origPos.y;

        // Seeded random sequence for bounce directions
        this._seed = 42;
        this._bounceCount = 0;

        // Splash rings at bounce points (tori)
        this._rings = [];
        var ringColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844,
                          0xaa44ff, 0x44ffff, 0xff44aa, 0xffaa44, 0x88ff44,
                          0xff6644, 0x4466ff];
        for (var i = 0; i < 12; i++) {
            var ringGeo = new THREE.TorusGeometry(0.04, 0.008, 6, 16);
            var ringMat = new THREE.MeshBasicMaterial({
                color: ringColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.visible = false;
            scene.add(ring);
            this._rings.push({ mesh: ring, life: 0, maxLife: 0, growRate: 0 });
        }
        this._ringIdx = 0;

        // Speed lines (stretched boxes trailing behind)
        this._lines = [];
        var lineGeo = new THREE.BoxGeometry(0.15, 0.004, 0.004);
        for (var j = 0; j < 10; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            line.visible = false;
            scene.add(line);
            this._lines.push({ mesh: line, life: 0, maxLife: 0 });
        }
        this._lineIdx = 0;
        this._lastLine = 0;

        this._lastBounce = 0;
        this._squashTimer = 0;
        this._squashAxis = 'x'; // which axis got squashed
    },
    _nextRandom() {
        // Simple LCG seeded random
        this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
        return (this._seed / 0x7fffffff);
    },
    _spawnRing(x, y) {
        var r = this._rings[this._ringIdx % this._rings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0);
        r.mesh.scale.setScalar(1.0);
        r.mesh.material.opacity = 0.8;
        r.life = 0.6 + this._nextRandom() * 0.3;
        r.maxLife = r.life;
        r.growRate = 3 + this._nextRandom() * 4;
    },
    _spawnLine(x, y, vx, vy) {
        var l = this._lines[this._lineIdx % this._lines.length];
        this._lineIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(x, y, (Math.random() - 0.5) * 0.1);
        // Orient line opposite to velocity
        var angle = Math.atan2(vy, vx);
        l.mesh.rotation.z = angle;
        l.mesh.material.opacity = 0.5;
        l.life = 0.2;
        l.maxLife = 0.2;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.05) {
            // Phase 1: First bounce charge-up
            var t = progress / 0.05;
            model.scale.set(gs * (1 + t * 0.1), gs * (1 - t * 0.15), gs);
            model.position.set(orig.x, orig.y - t * 0.03, orig.z);
            this._posX = orig.x;
            this._posY = orig.y;
            this._velX = 1.8;
            this._velY = 2.2;
        } else if (progress < 0.35) {
            // Phase 2: Rapid bouncing, increasing speed
            var speedMult = 1.0 + ((progress - 0.05) / 0.30) * 1.5;
            this._updateBounce(model, delta, speedMult, time, gs);
        } else if (progress < 0.65) {
            // Phase 3: Peak insanity
            var speedMult2 = 2.5 + Math.sin(time * 3) * 0.5;
            this._updateBounce(model, delta, speedMult2, time, gs);
        } else if (progress < 0.82) {
            // Phase 4: Slowing down, longer arcs
            var t4 = (progress - 0.65) / 0.17;
            var speedMult3 = 2.5 * (1 - t4 * 0.7);
            this._updateBounce(model, delta, speedMult3, time, gs);
        } else if (progress < 0.95) {
            // Phase 5: Final bounces, settling toward origin
            var t5 = (progress - 0.82) / 0.13;
            var easeHome = t5 * t5;

            // Pull toward origin
            this._posX += (orig.x - this._posX) * delta * 3;
            this._posY += (orig.y - this._posY) * delta * 3;
            this._velX *= 0.97;
            this._velY *= 0.97;

            this._posX += this._velX * delta * (1 - easeHome);
            this._posY += this._velY * delta * (1 - easeHome);

            model.position.set(this._posX, this._posY, orig.z);
            model.scale.setScalar(gs);
            model.rotation.z = model.rotation.z * 0.95;
        } else {
            // Phase 6: Rest, catching breath (slight panting scale)
            var t6 = (progress - 0.95) / 0.05;
            var pant = Math.sin(t6 * Math.PI * 4) * 0.01 * (1 - t6);
            model.position.copy(orig);
            model.scale.set(gs * (1 + pant), gs * (1 - pant), gs);
            model.rotation.z = 0;
        }

        // Update splash rings
        for (var ri = 0; ri < this._rings.length; ri++) {
            var ring = this._rings[ri];
            if (ring.life <= 0) continue;
            ring.life -= delta;
            if (ring.life <= 0) { ring.mesh.visible = false; continue; }
            var lr = ring.life / ring.maxLife;
            ring.mesh.material.opacity = lr * 0.7;
            ring.mesh.scale.setScalar(1 + (1 - lr) * ring.growRate);
        }

        // Update speed lines
        for (var li = 0; li < this._lines.length; li++) {
            var ln = this._lines[li];
            if (ln.life <= 0) continue;
            ln.life -= delta;
            if (ln.life <= 0) { ln.mesh.visible = false; continue; }
            ln.mesh.material.opacity = 0.4 * (ln.life / ln.maxLife);
        }
    },
    _updateBounce(model, delta, speedMult, time, gs) {
        var orig = this._origPos;

        this._posX += this._velX * delta * speedMult;
        this._posY += this._velY * delta * speedMult;

        // Wall bounce detection
        var bounced = false;
        if (this._posX > orig.x + this._boundsX) {
            this._posX = orig.x + this._boundsX;
            this._velX = -Math.abs(this._velX) * (0.8 + this._nextRandom() * 0.4);
            this._velY += (this._nextRandom() - 0.5) * 1.5;
            this._squashAxis = 'x';
            bounced = true;
        } else if (this._posX < orig.x - this._boundsX) {
            this._posX = orig.x - this._boundsX;
            this._velX = Math.abs(this._velX) * (0.8 + this._nextRandom() * 0.4);
            this._velY += (this._nextRandom() - 0.5) * 1.5;
            this._squashAxis = 'x';
            bounced = true;
        }
        if (this._posY > orig.y + this._boundsY) {
            this._posY = orig.y + this._boundsY;
            this._velY = -Math.abs(this._velY) * (0.8 + this._nextRandom() * 0.4);
            this._velX += (this._nextRandom() - 0.5) * 1.5;
            this._squashAxis = 'y';
            bounced = true;
        } else if (this._posY < orig.y - this._boundsY) {
            this._posY = orig.y - this._boundsY;
            this._velY = Math.abs(this._velY) * (0.8 + this._nextRandom() * 0.4);
            this._velX += (this._nextRandom() - 0.5) * 1.5;
            this._squashAxis = 'y';
            bounced = true;
        }

        if (bounced) {
            this._bounceCount++;
            this._squashTimer = 0.1;
            this._spawnRing(this._posX, this._posY);
            this._lastBounce = time;
        }

        // Speed lines while moving fast
        var speed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);
        if (speed > 1.0 && time - this._lastLine > 0.04) {
            this._spawnLine(this._posX, this._posY, -this._velX, -this._velY);
            this._lastLine = time;
        }

        model.position.set(this._posX, this._posY, this._origPos.z);

        // Squash/stretch on impact
        if (this._squashTimer > 0) {
            this._squashTimer -= delta;
            var sq = this._squashTimer / 0.1;
            if (this._squashAxis === 'x') {
                model.scale.set(gs * (1 - sq * 0.2), gs * (1 + sq * 0.15), gs);
            } else {
                model.scale.set(gs * (1 + sq * 0.15), gs * (1 - sq * 0.2), gs);
            }
        } else {
            // Stretch in direction of travel
            var stretchAmt = Math.min(speed * 0.03, 0.12);
            var moveAngle = Math.atan2(this._velY, this._velX);
            model.rotation.z = moveAngle * 0.15;
            model.scale.set(gs * (1 + stretchAmt), gs * (1 - stretchAmt * 0.5), gs);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._lines) { this._lines.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        this._rings = this._lines = null;
    }
};
