/**
 * Takes in a snapshot and returns all of its `data()`,
 * as well as `id` and `createdAt` and `updatedAt` `Date`
 */
export function docSnapshotToObject<T>(
  snapshot: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
): T | null {
  if (!snapshot.exists) {
    return null
  }
  const data: any = snapshot.data()
  if (data.expires) {
    data.expires = data.expires.toDate()
  }
  return {
    id: snapshot.id,
    ...data,
    // @ts-expect-error
    createdAt: snapshot.createTime.toDate(),
    // @ts-expect-error
    updatedAt: snapshot.updateTime.toDate(),
  }
}

export function querySnapshotToObject<T>(
  snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
): T | null {
  if (snapshot.empty) {
    return null
  }
  const doc = snapshot.docs[0]

  const data = doc.data()
  if (data.expires) {
    data.expires = data.expires.toDate()
  }
  return {
    id: doc.id,
    ...data,
    createdAt: doc.createTime.toDate(),
    updatedAt: doc.updateTime.toDate(),
  } as any
}
