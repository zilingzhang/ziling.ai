export default {
    name: 'Thundering',
    label: 'thundering',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Dark overlay for storm atmosphere
        var overlayGeo = new THREE.PlaneGeometry(6, 6);
        var overlayMat = new THREE.MeshBasicMaterial({
            color: 0x111122, transparent: true, opacity: 0,
            depthWrite: false, side: THREE.DoubleSide
        });
        this._overlay = new THREE.Mesh(overlayGeo, overlayMat);
        this._overlay.position.set(this._origPos.x, this._origPos.y, -0.5);
        scene.add(this._overlay);

        // Flash sphere - huge, brief additive for lightning illumination
        var flashGeo = new THREE.SphereGeometry(3, 8, 8);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xddeeff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(this._origPos.x, this._origPos.y, -0.3);
        scene.add(this._flash);

        // Lightning bolt line geometries - zigzag from top to bottom
        this._bolts = [];
        for (var b = 0; b < 4; b++) {
            var boltPoints = this._generateBoltPoints(
                this._origPos.x + (Math.random() - 0.5) * 1.0,
                this._origPos.y + 1.2,
                this._origPos.x + (Math.random() - 0.5) * 0.6,
                this._origPos.y - 0.6
            );
            var bGeo = new THREE.BufferGeometry().setFromPoints(boltPoints);
            var bMat = new THREE.LineBasicMaterial({
                color: b % 2 === 0 ? 0xccddff : 0xeeeeff,
                transparent: true, opacity: 0, linewidth: 2
            });
            var bolt = new THREE.Line(bGeo, bMat);
            bolt.visible = false;
            scene.add(bolt);
            this._bolts.push({
                line: bolt, flashTime: 0, active: false,
                topX: this._origPos.x + (Math.random() - 0.5) * 1.0,
                botX: this._origPos.x + (Math.random() - 0.5) * 0.6
            });
        }

        // Bolt glow lines (thicker, dimmer copies)
        this._boltGlows = [];
        for (var bg = 0; bg < 4; bg++) {
            var glGeo = new THREE.BufferGeometry().setFromPoints(this._generateBoltPoints(
                this._origPos.x, this._origPos.y + 1.2,
                this._origPos.x, this._origPos.y - 0.6
            ));
            var glMat = new THREE.LineBasicMaterial({
                color: 0x6688ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var glLine = new THREE.Line(glGeo, glMat);
            glLine.visible = false;
            scene.add(glLine);
            this._boltGlows.push(glLine);
        }

        // Rumble ring tori - expand from lightning impact
        this._rumbles = [];
        for (var r = 0; r < 8; r++) {
            var rGeo = new THREE.TorusGeometry(0.05, 0.01, 6, 16);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0x8899cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rumble = new THREE.Mesh(rGeo, rMat);
            rumble.rotation.x = Math.PI / 2;
            rumble.visible = false;
            scene.add(rumble);
            this._rumbles.push({
                mesh: rumble, life: 0, maxLife: 0, active: false,
                baseX: 0, baseY: 0
            });
        }
        this._rumbleIdx = 0;

        // Strike timing
        this._nextStrike = 0;
        this._strikeCount = 0;
        this._flashTimer = 0;
        this._activeBolt = -1;
    },
    _generateBoltPoints: function(x1, y1, x2, y2) {
        var points = [];
        var segments = 8 + Math.floor(Math.random() * 4);
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            var bx = x1 + (x2 - x1) * t + (i > 0 && i < segments ? (Math.random() - 0.5) * 0.3 : 0);
            var by = y1 + (y2 - y1) * t;
            points.push({ x: bx, y: by, z: 0 });
        }
        return points;
    },
    _refreshBolt: function(boltIdx, THREE) {
        var bolt = this._bolts[boltIdx];
        var newPoints = this._generateBoltPoints(
            bolt.topX, this._origPos.y + 1.2,
            bolt.botX, this._origPos.y - 0.6
        );
        var vectors = [];
        for (var i = 0; i < newPoints.length; i++) {
            vectors.push(new THREE.Vector3(newPoints[i].x, newPoints[i].y, newPoints[i].z));
        }
        bolt.line.geometry.dispose();
        bolt.line.geometry = new THREE.BufferGeometry().setFromPoints(vectors);

        // Also update glow
        this._boltGlows[boltIdx].geometry.dispose();
        this._boltGlows[boltIdx].geometry = new THREE.BufferGeometry().setFromPoints(vectors);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;
        var shakeIntensity = 0;

        // Phase: Storm builds, sky darkens (0-10%)
        if (progress < 0.10) {
            intensity = progress / 0.10;
            this._overlay.material.opacity = intensity * 0.3;
        }
        // Phase: First lightning strike with flash (10-25%)
        else if (progress < 0.25) {
            intensity = 0.7;
            this._overlay.material.opacity = 0.3;
            if (this._strikeCount === 0 && progress > 0.12) {
                this._triggerStrike(0, time, THREE);
                this._strikeCount = 1;
            }
        }
        // Phase: Rapid successive strikes (25-55%)
        else if (progress < 0.55) {
            intensity = 1.0;
            this._overlay.material.opacity = 0.35;
            var strikePeriod = 0.08;
            var strikeProgress = (progress - 0.25) / 0.30;
            var expectedStrikes = Math.floor(strikeProgress / strikePeriod) + 1;
            if (expectedStrikes > this._strikeCount && this._strikeCount < 10) {
                var bIdx = this._strikeCount % this._bolts.length;
                this._triggerStrike(bIdx, time, THREE);
                this._strikeCount++;
            }
        }
        // Phase: Massive final bolt (55-70%)
        else if (progress < 0.70) {
            intensity = 1.0;
            this._overlay.material.opacity = 0.35;
            if (this._strikeCount < 12 && progress > 0.57) {
                // Trigger multiple bolts simultaneously
                for (var mb = 0; mb < this._bolts.length; mb++) {
                    this._triggerStrike(mb, time, THREE);
                }
                this._strikeCount = 12;
            }
        }
        // Phase: Afterglow, rumble rings (70-85%)
        else if (progress < 0.85) {
            var afterFade = (progress - 0.70) / 0.15;
            intensity = 1.0 - afterFade * 0.7;
            this._overlay.material.opacity = 0.35 * (1 - afterFade);
        }
        // Phase: Storm passes (85-100%)
        else {
            var passRate = (progress - 0.85) / 0.15;
            intensity = 0.3 * (1 - passRate);
            this._overlay.material.opacity = 0.35 * (1 - passRate) * 0.3;
        }

        // Update bolt flash timers
        this._flashTimer -= delta;
        if (this._flashTimer > 0) {
            this._flash.material.opacity = Math.min(this._flashTimer * 4, 0.5);
            shakeIntensity = Math.min(this._flashTimer * 6, 1.0);
        } else {
            this._flash.material.opacity = 0;
        }

        // Update individual bolt visibility
        for (var bi = 0; bi < this._bolts.length; bi++) {
            var b = this._bolts[bi];
            if (b.active) {
                var elapsed = time - b.flashTime;
                if (elapsed < 0.15) {
                    b.line.visible = true;
                    b.line.material.opacity = 0.9 * (1 - elapsed / 0.15);
                    this._boltGlows[bi].visible = true;
                    this._boltGlows[bi].material.opacity = 0.4 * (1 - elapsed / 0.15);
                } else {
                    b.line.visible = false;
                    b.active = false;
                    this._boltGlows[bi].visible = false;
                }
            }
        }

        // Update rumble rings
        for (var ri = 0; ri < this._rumbles.length; ri++) {
            var rm = this._rumbles[ri];
            if (!rm.active) continue;
            rm.life -= delta;
            if (rm.life <= 0) { rm.active = false; rm.mesh.visible = false; continue; }
            var rProgress = 1 - (rm.life / rm.maxLife);
            rm.mesh.scale.setScalar(1 + rProgress * 8);
            rm.mesh.material.opacity = 0.3 * (1 - rProgress) * intensity;
        }

        // Model shake from thunder
        var shakeX = Math.sin(time * 40) * 0.08 * shakeIntensity;
        var shakeY = Math.cos(time * 33) * 0.04 * shakeIntensity;
        model.position.set(orig.x + shakeX, orig.y + shakeY, orig.z);
        model.rotation.z = Math.sin(time * 25) * 0.06 * shakeIntensity;

        // Settle at end
        if (progress >= 0.85) {
            var settle = (progress - 0.85) / 0.15;
            model.position.set(
                orig.x + shakeX * (1 - settle),
                orig.y + shakeY * (1 - settle),
                orig.z
            );
            model.rotation.z = Math.sin(time * 25) * 0.06 * shakeIntensity * (1 - settle);
            if (settle > 0.9) {
                model.position.copy(orig);
                model.rotation.z = 0;
            }
        }
    },
    _triggerStrike: function(boltIdx, time, THREE) {
        var bolt = this._bolts[boltIdx];
        bolt.active = true;
        bolt.flashTime = time;

        // Refresh bolt geometry with new random zigzag
        bolt.topX = this._origPos.x + (Math.random() - 0.5) * 1.2;
        bolt.botX = this._origPos.x + (Math.random() - 0.5) * 0.8;
        this._refreshBolt(boltIdx, THREE);

        // Trigger flash
        this._flashTimer = 0.2;

        // Spawn rumble ring at impact point
        var rm = this._rumbles[this._rumbleIdx % this._rumbles.length];
        this._rumbleIdx++;
        rm.active = true;
        rm.mesh.visible = true;
        rm.mesh.position.set(bolt.botX, this._origPos.y - 0.6, 0);
        rm.mesh.scale.setScalar(1);
        rm.life = 0.8 + Math.random() * 0.4;
        rm.maxLife = rm.life;
        rm.mesh.material.opacity = 0.3;
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._overlay) { scene.remove(this._overlay); this._overlay.geometry.dispose(); this._overlay.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        if (this._bolts) { this._bolts.forEach(function(b) { scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); }); }
        if (this._boltGlows) { this._boltGlows.forEach(function(g) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); }); }
        if (this._rumbles) { this._rumbles.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        this._overlay = this._flash = this._bolts = this._boltGlows = this._rumbles = null;
    }
};
