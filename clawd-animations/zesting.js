export default {
    name: 'Zesting',
    label: 'zesting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Citrus sphere (lemon/orange)
        var citrusGeo = new THREE.SphereGeometry(0.16, 14, 14);
        var citrusMat = new THREE.MeshBasicMaterial({
            color: 0xffdd00, transparent: true, opacity: 0
        });
        this._citrus = new THREE.Mesh(citrusGeo, citrusMat);
        this._citrus.position.set(ox - 0.3, oy - 0.12, 0);
        scene.add(this._citrus);

        // Scrape mark (dark patch that grows - torus segment)
        var scrapeGeo = new THREE.TorusGeometry(0.14, 0.025, 6, 12, Math.PI * 0.01);
        var scrapeMat = new THREE.MeshBasicMaterial({
            color: 0xaa8800, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._scrape = new THREE.Mesh(scrapeGeo, scrapeMat);
        this._scrape.position.set(ox - 0.3, oy - 0.12, 0.01);
        this._scrape.rotation.z = Math.PI * 0.3;
        scene.add(this._scrape);
        this._scrapeArc = 0.01;

        // Zest particles (tiny yellow-green bits)
        this._zest = [];
        var zestGeo = new THREE.BoxGeometry(0.012, 0.005, 0.005);
        for (var i = 0; i < 25; i++) {
            var zMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xeedd00 : (i % 3 === 1 ? 0xccee22 : 0xffee44),
                transparent: true, opacity: 0
            });
            var zMesh = new THREE.Mesh(zestGeo, zMat);
            zMesh.visible = false;
            scene.add(zMesh);
            this._zest.push({
                mesh: zMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0, vrot: 0
            });
        }
        this._zestIdx = 0;
        this._lastZest = 0;

        // Aromatic glow wisps (green-yellow ethereal)
        this._aroma = [];
        var aromaGeo = new THREE.SphereGeometry(0.04, 6, 6);
        for (var a = 0; a < 8; a++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: a % 2 === 0 ? 0x88ff44 : 0xccff66,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aMesh = new THREE.Mesh(aromaGeo, aMat);
            aMesh.visible = false;
            scene.add(aMesh);
            this._aroma.push({
                mesh: aMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, wobblePhase: Math.random() * Math.PI * 2
            });
        }
        this._aromaIdx = 0;

        // Aromatic burst glow
        var burstGeo = new THREE.SphereGeometry(0.25, 10, 10);
        var burstMat = new THREE.MeshBasicMaterial({
            color: 0x88ff44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aromaBurst = new THREE.Mesh(burstGeo, burstMat);
        this._aromaBurst.position.set(ox - 0.3, oy - 0.05, 0);
        scene.add(this._aromaBurst);

        this._scrapeCount = 0;
    },
    _emitZest(x, y, direction) {
        for (var i = 0; i < 3; i++) {
            var z = this._zest[this._zestIdx % this._zest.length];
            this._zestIdx++;
            z.mesh.visible = true;
            z.mesh.position.set(x, y, 0.08);
            var spreadAngle = direction + (Math.random() - 0.5) * 1.2;
            var spd = 0.8 + Math.random() * 1.2;
            z.vx = Math.cos(spreadAngle) * spd;
            z.vy = Math.sin(spreadAngle) * spd + 0.3;
            z.vz = 0.2 + Math.random() * 0.4;
            z.vrot = (Math.random() - 0.5) * 10;
            z.life = 0.4 + Math.random() * 0.4;
            z.maxLife = z.life;
            z.mesh.material.opacity = 0.8;
            z.mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        }
    },
    _emitAroma(x, y) {
        var a = this._aroma[this._aromaIdx % this._aroma.length];
        this._aromaIdx++;
        a.mesh.visible = true;
        a.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        a.vx = (Math.random() - 0.5) * 0.15;
        a.vy = 0.25 + Math.random() * 0.2;
        a.life = 1.0 + Math.random() * 0.5;
        a.maxLife = a.life;
        a.mesh.material.opacity = 0.35;
        a.mesh.scale.setScalar(0.3 + Math.random() * 0.4);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var citrusX = ox - 0.3;
        var citrusY = oy - 0.12;

        if (progress < 0.10) {
            // Phase 1: Citrus appears
            var t = progress / 0.10;
            var ease = t * t;
            this._citrus.material.opacity = ease * 0.85;
            // Citrus bounces in
            this._citrus.position.y = citrusY + (1 - ease) * 0.3;
            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Scraping starts, zest sprays
            var t2 = (progress - 0.10) / 0.25;
            this._citrus.material.opacity = 0.85;
            this._citrus.position.y = citrusY;

            // Scraping motion - model oscillates across citrus surface
            var scrapePhase = time * 3.5;
            var scrapeX = Math.sin(scrapePhase) * 0.06;
            model.position.set(ox + 0.1 + scrapeX * 0.5, oy + Math.sin(scrapePhase * 2) * 0.015, oz);
            model.rotation.z = Math.sin(scrapePhase) * 0.06;

            // Emit zest particles during scrape
            if (time - this._lastZest > 0.15) {
                var dir = Math.sin(scrapePhase) > 0 ? Math.PI * 0.7 : Math.PI * 0.3;
                this._emitZest(citrusX + scrapeX * 0.8, citrusY + 0.12, dir);
                this._scrapeCount++;
                this._lastZest = time;
            }

            // Scrape mark grows
            this._scrapeArc = Math.min(Math.PI * 0.8, 0.01 + this._scrapeCount * 0.04);
            this._scrape.geometry.dispose();
            this._scrape.geometry = new THREE.TorusGeometry(0.14, 0.025, 6, 12, this._scrapeArc);
            this._scrape.material.opacity = Math.min(t2 * 2, 0.5);

            // Citrus rotates slowly as it is zested
            this._citrus.rotation.y = t2 * 0.3;

            // Light aroma
            if (Math.random() < 0.03) {
                this._emitAroma(citrusX, citrusY + 0.1);
            }
        } else if (progress < 0.65) {
            // Phase 3: Faster scraping, more particles
            var t3 = (progress - 0.35) / 0.30;

            // Faster scraping rhythm
            var fastPhase = time * 5.0;
            var fastScrapeX = Math.sin(fastPhase) * 0.08;
            model.position.set(ox + 0.1 + fastScrapeX * 0.4, oy + Math.sin(fastPhase * 2) * 0.02, oz);
            model.rotation.z = Math.sin(fastPhase) * 0.08;

            // More zest
            if (time - this._lastZest > 0.08) {
                var dir2 = Math.sin(fastPhase) > 0 ? Math.PI * 0.6 : Math.PI * 0.4;
                this._emitZest(citrusX + fastScrapeX * 0.7, citrusY + 0.13, dir2);
                if (t3 > 0.5) {
                    this._emitZest(citrusX + fastScrapeX * 0.5, citrusY + 0.1, dir2 + 0.5);
                }
                this._scrapeCount++;
                this._lastZest = time;
            }

            // Scrape mark continues growing
            this._scrapeArc = Math.min(Math.PI * 1.5, 0.01 + this._scrapeCount * 0.04);
            this._scrape.geometry.dispose();
            this._scrape.geometry = new THREE.TorusGeometry(0.14, 0.025, 6, 12, this._scrapeArc);
            this._scrape.material.opacity = 0.5 + t3 * 0.1;

            // Citrus continues rotating
            this._citrus.rotation.y = 0.3 + t3 * 0.5;

            // More aroma wisps
            if (Math.random() < 0.06 + t3 * 0.04) {
                this._emitAroma(citrusX, citrusY + 0.12);
            }
        } else if (progress < 0.80) {
            // Phase 4: Aromatic burst, green-yellow glow
            var t4 = (progress - 0.65) / 0.15;
            var burstEase = Math.sin(t4 * Math.PI);

            // Aromatic burst glow
            this._aromaBurst.material.opacity = burstEase * 0.2;
            this._aromaBurst.scale.setScalar(1 + burstEase * 0.8);

            // Continue gentle scraping
            var gentlePhase = time * 3.0;
            model.position.set(ox + 0.1 + Math.sin(gentlePhase) * 0.04, oy, oz);
            model.rotation.z = Math.sin(gentlePhase) * 0.04;

            // Lots of aroma wisps
            if (Math.random() < 0.12) {
                this._emitAroma(citrusX, citrusY + 0.1);
            }

            // Light zest still spraying
            if (time - this._lastZest > 0.15) {
                this._emitZest(citrusX, citrusY + 0.12, Math.PI * 0.5);
                this._lastZest = time;
            }

            // Citrus color slightly faded where scraped
            var fadeFactor = 0.85 + burstEase * 0.1;
            this._citrus.material.color.setRGB(fadeFactor, 0.87 * fadeFactor, 0);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.80) / 0.20;

            this._citrus.material.opacity = 0.85 * (1 - t5);
            this._scrape.material.opacity = 0.6 * (1 - t5);
            this._aromaBurst.material.opacity = 0.2 * (1 - t5);
            this._aromaBurst.scale.setScalar(1.8 + t5 * 0.3);

            model.position.set(ox + 0.1 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update zest particles
        for (var zi = 0; zi < this._zest.length; zi++) {
            var zp = this._zest[zi];
            if (zp.life <= 0) continue;
            zp.life -= delta;
            if (zp.life <= 0) { zp.mesh.visible = false; continue; }
            zp.mesh.position.x += zp.vx * delta;
            zp.mesh.position.y += zp.vy * delta;
            zp.mesh.position.z += zp.vz * delta;
            zp.vy -= 2.5 * delta;
            zp.mesh.rotation.z += zp.vrot * delta;
            var zlr = zp.life / zp.maxLife;
            zp.mesh.material.opacity = zlr * 0.7;
        }

        // Update aroma wisps
        for (var ai = 0; ai < this._aroma.length; ai++) {
            var ap = this._aroma[ai];
            if (ap.life <= 0) continue;
            ap.life -= delta;
            if (ap.life <= 0) { ap.mesh.visible = false; continue; }
            ap.mesh.position.x += ap.vx * delta;
            ap.mesh.position.y += ap.vy * delta;
            // Gentle swirling motion
            ap.mesh.position.x += Math.sin(time * 2 + ap.wobblePhase) * 0.003;
            var alr = ap.life / ap.maxLife;
            ap.mesh.material.opacity = alr * 0.3;
            ap.mesh.scale.setScalar(ap.mesh.scale.x + delta * 0.3);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._citrus) { scene.remove(this._citrus); this._citrus.geometry.dispose(); this._citrus.material.dispose(); }
        if (this._scrape) { scene.remove(this._scrape); this._scrape.geometry.dispose(); this._scrape.material.dispose(); }
        if (this._aromaBurst) { scene.remove(this._aromaBurst); this._aromaBurst.geometry.dispose(); this._aromaBurst.material.dispose(); }
        if (this._zest) { this._zest.forEach(function(z) { scene.remove(z.mesh); z.mesh.geometry.dispose(); z.mesh.material.dispose(); }); }
        if (this._aroma) { this._aroma.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        this._citrus = this._scrape = this._aromaBurst = this._zest = this._aroma = null;
    }
};
