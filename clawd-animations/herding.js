export default {
    name: 'Herding',
    label: 'herding',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Herd animals (small spheres)
        this._animals = [];
        var animalGeo = new THREE.SphereGeometry(0.035, 8, 8);
        var animalColors = [0xeedd99, 0xddcc88, 0xccbb77, 0xbbaa66, 0xddddaa,
                            0xeeddbb, 0xcccc99, 0xddbb88, 0xeecc99, 0xccaa77];
        for (var i = 0; i < 10; i++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: animalColors[i], transparent: true, opacity: 0,
                depthWrite: false
            });
            var animal = new THREE.Mesh(animalGeo, aMat);
            // Scatter randomly in wide area
            var ax = ox + (Math.random() - 0.5) * 1.6;
            var ay = oy + (Math.random() - 0.5) * 0.8;
            animal.position.set(ax, ay, 0);
            scene.add(animal);
            this._animals.push({
                mesh: animal,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                startX: ax, startY: ay,
                scattered: true,
                escapeTimer: 0
            });
        }

        // Pen (four line segments forming a box)
        this._penLines = [];
        var penSize = 0.25;
        var penCenter = { x: ox, y: oy - 0.1 };
        var penCorners = [
            [penCenter.x - penSize, penCenter.y - penSize, penCenter.x + penSize, penCenter.y - penSize],
            [penCenter.x + penSize, penCenter.y - penSize, penCenter.x + penSize, penCenter.y + penSize],
            [penCenter.x - penSize, penCenter.y + penSize, penCenter.x - penSize, penCenter.y - penSize],
            [penCenter.x - penSize, penCenter.y + penSize, penCenter.x + penSize, penCenter.y + penSize]
        ];
        for (var j = 0; j < 4; j++) {
            var pts = [
                new THREE.Vector3(penCorners[j][0], penCorners[j][1], 0),
                new THREE.Vector3(penCorners[j][2], penCorners[j][3], 0)
            ];
            var lGeo = new THREE.BufferGeometry().setFromPoints(pts);
            var lMat = new THREE.LineBasicMaterial({
                color: 0x886644, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var ln = new THREE.Line(lGeo, lMat);
            scene.add(ln);
            this._penLines.push(ln);
        }
        this._penCenter = penCenter;
        this._penSize = penSize;

        // Pen glow
        var penGlowGeo = new THREE.PlaneGeometry(penSize * 2.2, penSize * 2.2);
        var penGlowMat = new THREE.MeshBasicMaterial({
            color: 0x44aa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._penGlow = new THREE.Mesh(penGlowGeo, penGlowMat);
        this._penGlow.position.set(penCenter.x, penCenter.y, -0.02);
        scene.add(this._penGlow);

        // Nudge particles
        this._nudges = [];
        var nudgeGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var k = 0; k < 20; k++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0x88cc66 : 0xaadd88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var nudge = new THREE.Mesh(nudgeGeo, nMat);
            nudge.visible = false;
            scene.add(nudge);
            this._nudges.push({ mesh: nudge, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._nudgeIdx = 0;

        this._herderAngle = 0;
    },
    _emitNudge(x, y, dx, dy) {
        for (var i = 0; i < 3; i++) {
            var n = this._nudges[this._nudgeIdx % this._nudges.length];
            this._nudgeIdx++;
            n.mesh.visible = true;
            n.mesh.position.set(x, y, 0);
            n.vx = dx * (0.5 + Math.random() * 1.0);
            n.vy = dy * (0.5 + Math.random() * 1.0);
            n.life = 0.3 + Math.random() * 0.2;
            n.maxLife = n.life;
            n.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var penX = this._penCenter.x;
        var penY = this._penCenter.y;
        var penS = this._penSize;

        if (progress < 0.05) {
            // Animals scatter appear
            var t = progress / 0.05;
            for (var ai = 0; ai < this._animals.length; ai++) {
                this._animals[ai].mesh.material.opacity = t * 0.8;
            }
            model.position.set(ox + 0.6, oy, oz);
        } else if (progress < 0.75) {
            // Main herding phase
            var t2 = (progress - 0.05) / 0.70;

            // Pen lines appear gradually
            for (var pi = 0; pi < this._penLines.length; pi++) {
                this._penLines[pi].material.opacity = Math.min(0.5, t2 * 1.5);
            }

            // Model circles around herd
            this._herderAngle += delta * 1.8;
            var herdRadius = 0.7 - t2 * 0.35;
            var hx = penX + Math.cos(this._herderAngle) * herdRadius;
            var hy = penY + Math.sin(this._herderAngle) * herdRadius * 0.7;
            model.position.set(hx, hy, oz);
            model.rotation.z = Math.sin(this._herderAngle) * 0.1;

            // Push animals toward pen center
            for (var aj = 0; aj < this._animals.length; aj++) {
                var an = this._animals[aj];
                var dx = penX - an.mesh.position.x;
                var dy = penY - an.mesh.position.y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                // Distance from herder
                var hdx = an.mesh.position.x - hx;
                var hdy = an.mesh.position.y - hy;
                var hDist = Math.sqrt(hdx * hdx + hdy * hdy);

                // Push away from herder if close
                if (hDist < 0.35) {
                    an.vx += hdx / hDist * delta * 2.0;
                    an.vy += hdy / hDist * delta * 2.0;
                }

                // Gentle pull toward pen center
                var pullStr = 0.3 + t2 * 0.8;
                an.vx += dx * delta * pullStr;
                an.vy += dy * delta * pullStr;

                // Random scatter for some (escape attempts)
                an.escapeTimer -= delta;
                if (an.escapeTimer <= 0 && Math.random() < 0.005 && t2 < 0.7) {
                    an.vx += (Math.random() - 0.5) * 1.5;
                    an.vy += (Math.random() - 0.5) * 1.0;
                    an.escapeTimer = 2.0 + Math.random() * 3.0;
                }

                // Damping
                an.vx *= 0.95;
                an.vy *= 0.95;

                an.mesh.position.x += an.vx * delta;
                an.mesh.position.y += an.vy * delta;
                an.mesh.material.opacity = 0.8;

                // Wobble animation
                an.mesh.scale.setScalar(1 + Math.sin(time * 4 + aj * 0.7) * 0.1);
            }

            // Nudge particles when herder is close to an animal
            for (var ak = 0; ak < this._animals.length; ak++) {
                var an2 = this._animals[ak];
                var nd = Math.sqrt(Math.pow(an2.mesh.position.x - hx, 2) + Math.pow(an2.mesh.position.y - hy, 2));
                if (nd < 0.25 && Math.random() < 0.1) {
                    this._emitNudge(an2.mesh.position.x, an2.mesh.position.y,
                        (an2.mesh.position.x - hx) * 2, (an2.mesh.position.y - hy) * 2);
                }
            }
        } else if (progress < 0.90) {
            // All gathered, pen glows
            var t3 = (progress - 0.75) / 0.15;

            for (var pl = 0; pl < this._penLines.length; pl++) {
                this._penLines[pl].material.opacity = 0.5 + Math.sin(time * 3 + pl) * 0.2;
            }
            this._penGlow.material.opacity = t3 * 0.2;
            this._penGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.05);

            // Animals settle in pen
            for (var al = 0; al < this._animals.length; al++) {
                var an3 = this._animals[al];
                var tdx = penX + (Math.random() - 0.5) * penS * 0.8 - an3.mesh.position.x;
                var tdy = penY + (Math.random() - 0.5) * penS * 0.8 - an3.mesh.position.y;
                an3.mesh.position.x += tdx * delta * 0.5;
                an3.mesh.position.y += tdy * delta * 0.5;
                an3.mesh.scale.setScalar(1 + Math.sin(time * 2 + al * 0.5) * 0.05);
            }

            model.position.set(ox + 0.4, oy, oz);
            model.rotation.z = 0;
        } else {
            // Fade
            var t4 = (progress - 0.90) / 0.10;

            for (var pm = 0; pm < this._penLines.length; pm++) {
                this._penLines[pm].material.opacity = 0.5 * (1 - t4);
            }
            this._penGlow.material.opacity = 0.2 * (1 - t4);

            for (var am = 0; am < this._animals.length; am++) {
                this._animals[am].mesh.material.opacity = 0.8 * (1 - t4);
            }

            model.position.set(ox + 0.4 * (1 - t4), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update nudge particles
        for (var ni = 0; ni < this._nudges.length; ni++) {
            var np = this._nudges[ni];
            if (np.life <= 0) continue;
            np.life -= delta;
            if (np.life <= 0) { np.mesh.visible = false; continue; }
            np.mesh.position.x += np.vx * delta;
            np.mesh.position.y += np.vy * delta;
            np.mesh.material.opacity = 0.8 * (np.life / np.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._animals) {
            this._animals.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); });
        }
        if (this._penLines) {
            this._penLines.forEach(function(l) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
        }
        if (this._penGlow) { scene.remove(this._penGlow); this._penGlow.geometry.dispose(); this._penGlow.material.dispose(); }
        if (this._nudges) {
            this._nudges.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); });
        }
        this._animals = this._penLines = this._penGlow = this._nudges = null;
    }
};
