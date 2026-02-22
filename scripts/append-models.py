models = """
model LabelMedia {
  id             String   @id
  organizationId String
  category       String
  format         String
  name           String
  data           String   @db.Text
  timestamp      BigInt
  createdAt      DateTime @default(now())
  
  @@index([organizationId])
  @@index([category])
  @@index([format])
}

model LabelBatch {
  id             String   @id
  organizationId String
  model          String   
  format         String   
  poids          String   
  lot            String   
  ddm            String   
  labels         Json     @default("[]")
  timestamp      BigInt   
  createdAt      DateTime @default(now())

  @@index([organizationId])
}

model LabelFont {
  id             String   @id
  organizationId String
  name           String   
  displayName    String   
  data           String   @db.Text
  type           String   
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([name])
}

model LabelFolder {
  id             String   @id
  organizationId String
  name           String
  parentId       String?
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([parentId])
}

model LabelTemplate {
  id             String   @id
  organizationId String
  folderId       String?
  name           String
  design         Json     @default("{}")
  format         String
  side           String
  preview        String?  @db.Text
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([folderId])
}

model LabelPreset {
  id             String   @id
  organizationId String
  name           String
  type           String
  format         String
  folder         String?
  properties     Json     @default("{}")
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([type])
  @@index([format])
}
"""

with open(r'c:\Users\Sébastien\.gemini\antigravity\scratch\prisma\schema.prisma', 'a', encoding='utf-8') as f:
    f.write(models)
