export abstract class Translation {
  public message!: string;
  public plural?: string;
  public context?: string;

  public toJSON() {
    return {
      message: this.message,
      plural: this.plural,
      context: this.context,
    };
  }
}
