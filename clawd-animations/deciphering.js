export default {
    name: 'Deciphering',
    label: 'deciphering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 8 scrambled symbol cubes floating around model
        this._symbols = [];
        var symGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
        var symColors = [0x44ddff, 0xff44aa, 0xaaff44, 0xffaa44, 0xaa44ff, 0x44ffaa, 0xff4488, 0x88aaff];
        for (var i = 0; i < 8; i++) {
            var symMat = new THREE.MeshBasicMaterial({
                color: symColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sym = new THREE.Mesh(symGeo, symMat);
            sym.visible = false;
            scene.add(sym);

            var angle = (i / 8) * Math.PI * 2;
            var dist = 0.3 + Math.random() * 0.15;
            this._symbols.push({
                mesh: sym,
                targetAngle: angle,
                targetDist: dist,
                targetX: ox + Math.cos(angle) * dist,
                targetY: oy + 0.1 + Math.sin(angle) * dist * 0.6,
                scrambleRx: Math.random() * 10 - 5,
                scrambleRy: Math.random() * 10 - 5,
                scrambleRz: Math.random() * 10 - 5,
                decoded: false,
                decodeTime: 0.15 + i * 0.08
            });
        }

        // Connection lines between decoded symbols
        this._connections = [];
        var connPairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,4],[1,5],[2,6],[3,7]];
        for (var c = 0; c < connPairs.length; c++) {
            var pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            var connGeo = new THREE.BufferGeometry().setFromPoints(pts);
            var connMat = new THREE.LineBasicMaterial({
                color: 0x66ddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var connLine = new THREE.Line(connGeo, connMat);
            connLine.visible = false;
            scene.add(connLine);
            this._connections.push({
                line: connLine,
                from: connPairs[c][0],
                to: connPairs[c][1],
                active: false
            });
        }

        // Aha-glow particles (flash on decode)
        this._ahaParticles = [];
        var ahaGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var a = 0; a < 16; a++) {
            var ahaMat = new THREE.MeshBasicMaterial({
                color: a % 2 === 0 ? 0xffffff : 0xaaeeff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aha = new THREE.Mesh(ahaGeo, ahaMat);
            aha.visible = false;
            scene.add(aha);
            this._ahaParticles.push({
                mesh: aha,
                life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._ahaIdx = 0;

        // Final pattern glow
        var patGeo = new THREE.SphereGeometry(0.4, 14, 14);
        var patMat = new THREE.MeshBasicMaterial({
            color: 0x44ddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._patternGlow = new THREE.Mesh(patGeo, patMat);
        this._patternGlow.position.set(ox, oy + 0.1, -0.05);
        scene.add(this._patternGlow);

        this._decodedCount = 0;
    },
    _spawnAha(x, y) {
        for (var i = 0; i < 4; i++) {
            var p = this._ahaParticles[this._ahaIdx % this._ahaParticles.length];
            this._ahaIdx++;
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0.04);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.5;
            p.vx = Math.cos(a) * spd;
            p.vy = Math.sin(a) * spd;
            p.vz = (Math.random() - 0.5) * 0.2;
            p.life = 0.3 + Math.random() * 0.3;
            p.maxLife = p.life;
            p.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Scrambled cubes appear, tumbling wildly
            var t = progress / 0.08;
            for (var i = 0; i < 8; i++) {
                var sym = this._symbols[i];
                sym.mesh.visible = true;
                sym.mesh.material.opacity = t * 0.6;
                var sa = (i / 8) * Math.PI * 2 + time * 2;
                var sd = 0.35 + Math.sin(time * 3 + i) * 0.05;
                sym.mesh.position.set(ox + Math.cos(sa) * sd, oy + 0.1 + Math.sin(sa) * sd * 0.6, 0.03);
                sym.mesh.rotation.x += sym.scrambleRx * delta;
                sym.mesh.rotation.y += sym.scrambleRy * delta;
                sym.mesh.rotation.z += sym.scrambleRz * delta;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.65) {
            // Phase 2: Symbols decode one by one
            var t2 = (progress - 0.08) / 0.57;

            for (var j = 0; j < 8; j++) {
                var s2 = this._symbols[j];
                if (t2 > s2.decodeTime && !s2.decoded) {
                    // Decode this symbol
                    s2.decoded = true;
                    this._decodedCount++;
                    this._spawnAha(s2.mesh.position.x, s2.mesh.position.y);
                }

                if (s2.decoded) {
                    // Decoded: settle into position, stop tumbling
                    var settleProg = Math.min(1, (t2 - s2.decodeTime) * 5);
                    var ease = 1 - Math.pow(1 - settleProg, 3);
                    var sa2 = s2.targetAngle;
                    var sd2 = s2.targetDist;
                    var tx = ox + Math.cos(sa2) * sd2;
                    var ty = oy + 0.1 + Math.sin(sa2) * sd2 * 0.6;
                    s2.mesh.position.x += (tx - s2.mesh.position.x) * ease * 0.1;
                    s2.mesh.position.y += (ty - s2.mesh.position.y) * ease * 0.1;
                    s2.mesh.rotation.x += s2.scrambleRx * delta * (1 - ease);
                    s2.mesh.rotation.y += s2.scrambleRy * delta * (1 - ease);
                    s2.mesh.rotation.z += s2.scrambleRz * delta * (1 - ease);
                    s2.mesh.material.opacity = 0.7 + ease * 0.2;
                } else {
                    // Still scrambled
                    var sa3 = (j / 8) * Math.PI * 2 + time * (1.5 - t2 * 0.5);
                    var sd3 = 0.35 + Math.sin(time * 2 + j) * 0.05;
                    s2.mesh.position.set(ox + Math.cos(sa3) * sd3, oy + 0.1 + Math.sin(sa3) * sd3 * 0.6, 0.03);
                    s2.mesh.rotation.x += s2.scrambleRx * delta;
                    s2.mesh.rotation.y += s2.scrambleRy * delta;
                    s2.mesh.rotation.z += s2.scrambleRz * delta;
                    s2.mesh.material.opacity = 0.5 + Math.sin(time * 3 + j) * 0.1;
                }
            }

            // Activate connections between decoded neighbors
            for (var ci = 0; ci < this._connections.length; ci++) {
                var conn = this._connections[ci];
                var fromSym = this._symbols[conn.from];
                var toSym = this._symbols[conn.to];
                if (fromSym.decoded && toSym.decoded && !conn.active) {
                    conn.active = true;
                    conn.line.visible = true;
                }
                if (conn.active) {
                    var positions = conn.line.geometry.attributes.position;
                    positions.setXYZ(0, fromSym.mesh.position.x, fromSym.mesh.position.y, 0.02);
                    positions.setXYZ(1, toSym.mesh.position.x, toSym.mesh.position.y, 0.02);
                    positions.needsUpdate = true;
                    conn.line.material.opacity = 0.3 + Math.sin(time * 4 + ci) * 0.1;
                }
            }

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 1) * 0.015;
        } else if (progress < 0.82) {
            // Phase 3: Final pattern revealed, all connections glow
            var t3 = (progress - 0.65) / 0.17;
            this._patternGlow.material.opacity = t3 * 0.2;
            this._patternGlow.scale.setScalar(1 + t3 * 0.3);

            for (var ck = 0; ck < this._connections.length; ck++) {
                var c3 = this._connections[ck];
                if (c3.active) {
                    c3.line.material.opacity = 0.4 + t3 * 0.3;
                    c3.line.material.color.setHex(0xaaeeff);
                    var positions3 = c3.line.geometry.attributes.position;
                    var fs = this._symbols[c3.from];
                    var ts = this._symbols[c3.to];
                    positions3.setXYZ(0, fs.mesh.position.x, fs.mesh.position.y, 0.02);
                    positions3.setXYZ(1, ts.mesh.position.x, ts.mesh.position.y, 0.02);
                    positions3.needsUpdate = true;
                }
            }

            for (var sk = 0; sk < 8; sk++) {
                this._symbols[sk].mesh.material.opacity = 0.9 + Math.sin(time * 5 + sk) * 0.1;
            }

            model.position.set(ox, oy + 0.01, oz);
            model.rotation.z = 0;
        } else {
            // Phase 4: Fade everything
            var t4 = (progress - 0.82) / 0.18;
            this._patternGlow.material.opacity = 0.2 * (1 - t4);

            for (var sl = 0; sl < 8; sl++) {
                this._symbols[sl].mesh.material.opacity = 0.9 * (1 - t4);
            }
            for (var cl = 0; cl < this._connections.length; cl++) {
                this._connections[cl].line.material.opacity *= (1 - t4 * 0.05);
            }

            model.position.set(ox, oy + 0.01 * (1 - t4), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update aha particles
        for (var ai = 0; ai < this._ahaParticles.length; ai++) {
            var ap = this._ahaParticles[ai];
            if (ap.life <= 0) continue;
            ap.life -= delta;
            if (ap.life <= 0) { ap.mesh.visible = false; continue; }
            ap.mesh.position.x += ap.vx * delta;
            ap.mesh.position.y += ap.vy * delta;
            ap.mesh.position.z += ap.vz * delta;
            var lr = ap.life / ap.maxLife;
            ap.mesh.material.opacity = lr * 0.8;
            ap.mesh.scale.setScalar(0.5 + (1 - lr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._symbols) {
            this._symbols.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._connections) {
            this._connections.forEach(function(c) {
                scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose();
            });
        }
        if (this._ahaParticles) {
            this._ahaParticles.forEach(function(a) {
                scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose();
            });
        }
        if (this._patternGlow) { scene.remove(this._patternGlow); this._patternGlow.geometry.dispose(); this._patternGlow.material.dispose(); }
        this._symbols = this._connections = this._ahaParticles = this._patternGlow = null;
    }
};
