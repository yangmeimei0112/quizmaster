-- AlterTable
ALTER TABLE "Question" ADD COLUMN "wrongCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Question_wrongCount_idx" ON "Question"("wrongCount");

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongQuestionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "wrongCount" INTEGER NOT NULL DEFAULT 1,
    "lastUserAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongQuestionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "WrongQuestionRecord_userId_idx" ON "WrongQuestionRecord"("userId");

-- CreateIndex
CREATE INDEX "WrongQuestionRecord_questionId_idx" ON "WrongQuestionRecord"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WrongQuestionRecord_userId_questionId_key" ON "WrongQuestionRecord"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "WrongQuestionRecord" ADD CONSTRAINT "WrongQuestionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestionRecord" ADD CONSTRAINT "WrongQuestionRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
