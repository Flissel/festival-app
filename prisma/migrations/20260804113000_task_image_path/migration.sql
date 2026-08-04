-- Der Blob-Speicher ist privat: Ausgeliefert wird das Foto nur über eine Route,
-- die vorher die Admin-Sitzung prüft. Gespeichert wird darum der Pfad im
-- Speicher, nicht eine öffentlich abrufbare URL. Die Spalte ist überall leer,
-- deshalb reicht das Umbenennen.
ALTER TABLE "Task" RENAME COLUMN "imageUrl" TO "imagePath";
