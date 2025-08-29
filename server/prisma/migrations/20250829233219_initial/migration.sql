-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "notes" TEXT,
    "salt" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "password_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_entry_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passwordEntryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "password_entry_tags_passwordEntryId_fkey" FOREIGN KEY ("passwordEntryId") REFERENCES "password_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "password_entry_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_userId_key" ON "tags"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_entries_site_username_userId_key" ON "password_entries"("site", "username", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_entry_tags_passwordEntryId_tagId_key" ON "password_entry_tags"("passwordEntryId", "tagId");
